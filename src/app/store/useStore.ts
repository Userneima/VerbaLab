import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { syncSave, syncLoad } from '../utils/api';
import {
  newCorpusEntryId,
  newErrorBankEntryId,
  newStuckPointId,
  newVocabCardId,
} from '../utils/ids';
import {
  mergeByIdNewerTimestamp,
  mergeLearnedCollocationIds,
  mergeFoundryExampleOverrides,
  type FoundryExampleOverridePack,
} from '../utils/syncMerge';
import {
  computeNextDueAfterView,
  computeAfterRemembered,
  computeAfterStruggled,
  initialNextDueAt,
  isVocabCardDue,
} from '../utils/vocabCardReview';
import {
  ERROR_REVIEW_RESET_HOURS,
  ERROR_REVIEW_STAGE_HOURS,
  MS_PER_HOUR,
} from '../utils/reviewConfig';
import { normalizeErrorSentenceForDedupe } from '../utils/errorBankDedupe';
import { corpusSentenceDedupeKey } from '../utils/corpusDedupe';
import { isBlankVocabCard } from '../utils/vocabCardBlank';
import { clearErrorReviewProduceDraft } from '../utils/errorReviewDraftStorage';

export interface CorpusEntry {
  id: string;
  timestamp: string;
  verbId: string;
  verb: string;
  collocationId: string;
  collocation: string;
  userSentence: string;
  isCorrect: boolean;
  mode: 'test' | 'field';
  tags: string[];
  /** 若为中式英语，母语者正确版本一并收录 */
  nativeVersion?: string;
  /** 母语者思维方式简述 */
  nativeThinking?: string;
  isChinglish?: boolean;
  /** 语料库点击翻译后缓存的整句中文（随同步写入云端） */
  zhTranslation?: string;
}

/** 错误库三大类：语法错 / 搭配错 / 中式表达错 */
export type ErrorCategory = 'grammar' | 'collocation' | 'chinglish';

export interface ErrorBankEntry {
  id: string;
  timestamp: string;
  verbId: string;
  verb: string;
  collocationId: string;
  collocation: string;
  originalSentence: string;
  /** 语法检查时 AI 给出的改正范例句（含目标搭配） */
  correctedSentence?: string;
  errorTypes: string[];
  /** 三大类之一 */
  errorCategory: ErrorCategory;
  diagnosis: string;
  hint: string;
  grammarPoints: string[];
  resolved: boolean;
  /** 中式表达错时：母语者正确版本 */
  nativeVersion?: string;
  /** 中式表达错时：母语者思维方式简述 */
  nativeThinking?: string;
  /** 极简复习：下次重测时间 (ISO) */
  nextReviewAt: string | null;
  /** 复习阶段 0=24h, 1=3d, 2=7d */
  reviewStage: number;
  /** 实验室写入：中文语境，供复习造句提示 */
  reviewCueZh?: string;
  /** 复习尝试次数（再产出失败等） */
  reviewAttemptCount?: number;
  lastReviewAttemptAt?: string;
  /** 错题再产出：第 1 步填空已通过（持久化，可接着做第 2 步） */
  reviewReproClozeDone?: boolean;
}

export interface StuckPointEntry {
  id: string;
  timestamp: string;
  chineseThought: string;
  englishAttempt: string;
  aiSuggestion: string;
  resolved: boolean;
  /** 实验室 / 实战仓，用于展开区展示来源 */
  sourceMode?: 'test' | 'field';
  /** 当时练习的英文搭配，与中文并列作列表标题 */
  contextCollocation?: string;
}

/** 语料库学习模块：单词卡 · 例句与复习（与实验室造句语料 CorpusEntry 分立） */
export interface VocabCardItem {
  id: string;
  questionId: string;
  part: number;
  topic: string;
  questionSnapshot: string;
  sentence: string;
  collocationsUsed: string[];
  chinese?: string;
}

export interface VocabCard {
  id: string;
  timestamp: string;
  headword: string;
  sense?: string;
  /** 例句实际使用的口语说法（可能与用户输入不同，如 genetic vs hereditary） */
  spokenPracticePhrase?: string;
  /** 用户输入的书面/正式说法，作补充（当与 spokenPracticePhrase 分流时） */
  writtenSupplement?: string;
  /** 为何采用口语说法的简短中文说明 */
  registerNoteZh?: string;
  spokenAlternatives?: string[];
  isCommonInSpokenEnglish?: boolean;
  tags: string[];
  items: VocabCardItem[];
  source: 'ai_word_lab';
  lastViewedAt: string | null;
  nextDueAt: string | null;
  reviewStage: number;
}

function normalizeVocabCardItem(raw: unknown, idx: number, cardId: string): VocabCardItem {
  const r = raw as Record<string, unknown>;
  const coll = r?.collocationsUsed;
  return {
    id: String(r?.id || `${cardId}-i${idx}`),
    questionId: String(r?.questionId || ''),
    part: r?.part === 0 ? 0 : Number(r?.part) || 1,
    topic: String(r?.topic || ''),
    questionSnapshot: String(r?.questionSnapshot || ''),
    sentence: String(r?.sentence || ''),
    collocationsUsed: Array.isArray(coll) ? coll.map(x => String(x)) : [],
    chinese: r?.chinese ? String(r.chinese) : undefined,
  };
}

function normalizeVocabCard(raw: unknown): VocabCard {
  const r = raw as Record<string, unknown>;
  const id = String(r?.id || newVocabCardId());
  const rawItems = r?.items;
  const items = Array.isArray(rawItems)
    ? rawItems.map((it: unknown, i: number) => normalizeVocabCardItem(it, i, id))
    : [];
  const altRaw = r?.spokenAlternatives;
  return {
    id,
    timestamp: String(r?.timestamp || new Date().toISOString()),
    headword: String(r?.headword || ''),
    sense: r?.sense ? String(r.sense) : undefined,
    spokenPracticePhrase:
      r?.spokenPracticePhrase != null && String(r.spokenPracticePhrase).trim()
        ? String(r.spokenPracticePhrase).trim()
        : undefined,
    writtenSupplement:
      r?.writtenSupplement != null && String(r.writtenSupplement).trim()
        ? String(r.writtenSupplement).trim()
        : undefined,
    registerNoteZh:
      r?.registerNoteZh != null && String(r.registerNoteZh).trim()
        ? String(r.registerNoteZh).trim()
        : undefined,
    spokenAlternatives: Array.isArray(altRaw)
      ? (altRaw as unknown[]).map(x => String(x).trim()).filter(Boolean)
      : undefined,
    isCommonInSpokenEnglish:
      typeof r?.isCommonInSpokenEnglish === 'boolean' ? r.isCommonInSpokenEnglish : undefined,
    tags: Array.isArray(r?.tags) ? (r.tags as unknown[]).map(t => String(t)) : [],
    items,
    source: 'ai_word_lab',
    lastViewedAt: r?.lastViewedAt != null ? String(r.lastViewedAt) : null,
    nextDueAt: r?.nextDueAt != null ? String(r.nextDueAt) : null,
    reviewStage: typeof r?.reviewStage === 'number' ? r.reviewStage : 0,
  };
}

export interface LearningProgress {
  learnedCollocations: Set<string>;
}

function normalizeFoundryExampleOverrides(raw: unknown): Record<string, FoundryExampleOverridePack> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, FoundryExampleOverridePack> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
    const vo = v as Record<string, unknown>;
    const itemsRaw = vo.items;
    if (!Array.isArray(itemsRaw)) continue;
    const items = itemsRaw
      .map((x: unknown) => {
        if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
        const o = x as Record<string, unknown>;
        const content = String(o.content ?? '').trim();
        if (!content) return null;
        const zh = o.chinese != null ? String(o.chinese).trim() : '';
        return {
          content,
          chinese: zh ? zh : undefined,
        };
      })
      .filter(Boolean) as FoundryExampleOverridePack['items'];
    out[k] = {
      items,
      updatedAt: String(vo.updatedAt || new Date(0).toISOString()),
    };
  }
  return out;
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (key === 'ff_foundry_examples') {
        return normalizeFoundryExampleOverrides(parsed) as unknown as T;
      }
      if (key === 'ff_learned' && Array.isArray(parsed)) {
        return new Set(parsed) as unknown as T;
      }
      if (key === 'ff_errors' && Array.isArray(parsed)) {
        const next24 = new Date(Date.now() + ERROR_REVIEW_RESET_HOURS * MS_PER_HOUR).toISOString();
        return parsed.map((e: any) => ({
          ...e,
          errorCategory: e.errorCategory ?? 'grammar',
          nextReviewAt: e.nextReviewAt ?? (e.resolved ? null : next24),
          reviewStage: e.reviewStage ?? 0,
          nativeVersion: e.nativeVersion,
          nativeThinking: e.nativeThinking,
          reviewCueZh: e.reviewCueZh,
          reviewAttemptCount: e.reviewAttemptCount,
          lastReviewAttemptAt: e.lastReviewAttemptAt,
          reviewReproClozeDone: e.reviewReproClozeDone,
        })) as unknown as T;
      }
      if (key === 'ff_vocab_cards' && Array.isArray(parsed)) {
        return parsed.map((c: any) => normalizeVocabCard(c)) as unknown as T;
      }
      return parsed;
    }
  } catch {}
  return defaultValue;
}

function saveToStorage<T>(key: string, value: T) {
  try {
    if (value instanceof Set) {
      localStorage.setItem(key, JSON.stringify(Array.from(value)));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {}
}

const DEBOUNCE_MS = 3000; // 3 seconds debounce for auto-sync

export function useAppStore(accessToken: string | null) {
  const [corpus, setCorpus] = useState<CorpusEntry[]>(() =>
    loadFromStorage<CorpusEntry[]>('ff_corpus', [])
  );
  const [errorBank, setErrorBank] = useState<ErrorBankEntry[]>(() =>
    loadFromStorage<ErrorBankEntry[]>('ff_errors', [])
  );
  const [stuckPoints, setStuckPoints] = useState<StuckPointEntry[]>(() =>
    loadFromStorage<StuckPointEntry[]>('ff_stuck', [])
  );
  const [learnedCollocations, setLearnedCollocations] = useState<Set<string>>(() =>
    loadFromStorage<Set<string>>('ff_learned', new Set())
  );
  const [vocabCards, setVocabCards] = useState<VocabCard[]>(() => {
    const raw = loadFromStorage<VocabCard[]>('ff_vocab_cards', []);
    return raw.filter(c => !isBlankVocabCard(c));
  });
  const [foundryExampleOverrides, setFoundryExampleOverrides] = useState<
    Record<string, FoundryExampleOverridePack>
  >(() => loadFromStorage<Record<string, FoundryExampleOverridePack>>('ff_foundry_examples', {}));
  const corpusDedupeIndexRef = useRef<Map<string, string>>(new Map());
  const errorDedupeIndexRef = useRef<Map<string, string>>(new Map());

  // Sync state
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'loading' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() =>
    localStorage.getItem('ff_last_sync')
  );
  const [syncError, setSyncError] = useState<string | null>(null);

  // Auto sync toggle (persisted). Default OFF to avoid auth-thrash during setup.
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    const v = localStorage.getItem('ff_auto_sync');
    if (v === null) return false;
    return v === '1';
  });

  useEffect(() => {
    try {
      localStorage.setItem('ff_auto_sync', autoSyncEnabled ? '1' : '0');
    } catch {}
  }, [autoSyncEnabled]);
  
  // Track whether initial cloud pull has been done for this session
  const initialPullDone = useRef(false);
  /** 一次性：旧版 localStorage 语料中文缓存 → 写入 CorpusEntry.zhTranslation，便于走同步 */
  const legacyCorpusZhMigrated = useRef(false);
  // Debounce timer ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track data version changes for auto-sync
  const dataVersion = useRef(0);
  const lastSyncedVersion = useRef(0);

  useEffect(() => {
    if (legacyCorpusZhMigrated.current) return;
    try {
      const raw = localStorage.getItem('ff_corpus_zh_cache');
      if (!raw) {
        legacyCorpusZhMigrated.current = true;
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, { translation?: string; sentence?: string }>;
      if (!parsed || typeof parsed !== 'object') {
        legacyCorpusZhMigrated.current = true;
        return;
      }
      setCorpus(prev => {
        let changed = false;
        const next = prev.map(e => {
          const row = parsed[e.id];
          const t = row?.translation?.trim();
          if (t && row?.sentence === e.userSentence && !e.zhTranslation) {
            changed = true;
            return { ...e, zhTranslation: t, timestamp: new Date().toISOString() };
          }
          return e;
        });
        return changed ? next : prev;
      });
      localStorage.removeItem('ff_corpus_zh_cache');
    } catch {
      /* ignore */
    }
    legacyCorpusZhMigrated.current = true;
  }, []);

  // Persist to localStorage
  useEffect(() => { saveToStorage('ff_corpus', corpus); }, [corpus]);
  useEffect(() => { saveToStorage('ff_errors', errorBank); }, [errorBank]);
  useEffect(() => { saveToStorage('ff_stuck', stuckPoints); }, [stuckPoints]);
  useEffect(() => { saveToStorage('ff_learned', learnedCollocations); }, [learnedCollocations]);
  useEffect(() => { saveToStorage('ff_vocab_cards', vocabCards); }, [vocabCards]);

  useEffect(() => {
    setVocabCards(prev => {
      const next = prev.filter(c => !isBlankVocabCard(c));
      return next.length === prev.length ? prev : next;
    });
  }, [vocabCards]);
  useEffect(() => {
    saveToStorage('ff_foundry_examples', foundryExampleOverrides);
  }, [foundryExampleOverrides]);
  useEffect(() => {
    const next = new Map<string, string>();
    for (const e of corpus) {
      next.set(corpusSentenceDedupeKey(e.collocationId, e.userSentence), e.id);
    }
    corpusDedupeIndexRef.current = next;
  }, [corpus]);
  useEffect(() => {
    const next = new Map<string, string>();
    for (const e of errorBank) {
      if (e.resolved) continue;
      next.set(`${e.collocationId}\0${normalizeErrorSentenceForDedupe(e.originalSentence)}`, e.id);
    }
    errorDedupeIndexRef.current = next;
  }, [errorBank]);

  const setFoundryExamplesForCollocation = useCallback(
    (collocationId: string, items: FoundryExampleOverridePack['items']) => {
      const cleaned = items
        .map(it => ({
          content: it.content.trim(),
          chinese: it.chinese?.trim() ? it.chinese.trim() : undefined,
        }))
        .filter(it => it.content.length > 0);
      setFoundryExampleOverrides(prev => {
        const next = { ...prev };
        if (cleaned.length === 0) {
          delete next[collocationId];
        } else {
          next[collocationId] = {
            items: cleaned,
            updatedAt: new Date().toISOString(),
          };
        }
        return next;
      });
    },
    []
  );

  const clearFoundryExamplesForCollocation = useCallback((collocationId: string) => {
    setFoundryExampleOverrides(prev => {
      if (!(collocationId in prev)) return prev;
      const next = { ...prev };
      delete next[collocationId];
      return next;
    });
  }, []);

  const markAsLearned = useCallback((colId: string) => {
    setLearnedCollocations(prev => {
      const next = new Set(prev);
      next.add(colId);
      return next;
    });
  }, []);

  const unmarkAsLearned = useCallback((colId: string) => {
    setLearnedCollocations(prev => {
      const next = new Set(prev);
      next.delete(colId);
      return next;
    });
  }, []);

  const addToCorpus = useCallback((entry: Omit<CorpusEntry, 'id' | 'timestamp'>) => {
    const now = new Date().toISOString();
    const incomingKey = corpusSentenceDedupeKey(entry.collocationId, entry.userSentence);

    let resultEntry: CorpusEntry;

    setCorpus(prev => {
      const dupId = corpusDedupeIndexRef.current.get(incomingKey);
      const dupIdx = dupId
        ? prev.findIndex(e => e.id === dupId)
        : prev.findIndex(e => corpusSentenceDedupeKey(e.collocationId, e.userSentence) === incomingKey);

      if (dupIdx !== -1) {
        const existing = prev[dupIdx];
        const mergedTags = Array.from(
          new Set([...existing.tags, ...entry.tags].map(t => t.trim()).filter(Boolean))
        );
        const newSentence = entry.userSentence.trim() || existing.userSentence;
        const sentenceChanged = newSentence !== existing.userSentence;
        resultEntry = {
          ...existing,
          timestamp: now,
          userSentence: newSentence,
          verbId: entry.verbId,
          verb: entry.verb,
          collocation: entry.collocation,
          isCorrect: entry.isCorrect && existing.isCorrect,
          mode: entry.mode,
          tags: mergedTags.length ? mergedTags : existing.tags,
          nativeVersion: entry.nativeVersion ?? existing.nativeVersion,
          nativeThinking: entry.nativeThinking ?? existing.nativeThinking,
          isChinglish: entry.isChinglish ?? existing.isChinglish,
          zhTranslation: sentenceChanged ? undefined : existing.zhTranslation,
        };
        const rest = prev.filter((_, i) => i !== dupIdx);
        return [resultEntry, ...rest];
      }

      resultEntry = {
        ...entry,
        id: newCorpusEntryId(),
        timestamp: now,
      };
      return [resultEntry, ...prev];
    });

    return resultEntry!;
  }, []);

  const removeCorpusEntry = useCallback((entryId: string) => {
    setCorpus(prev => prev.filter(e => e.id !== entryId));
  }, []);

  const setCorpusEntryZhTranslation = useCallback((entryId: string, translation: string) => {
    const trimmed = translation.trim();
    const now = new Date().toISOString();
    setCorpus(prev =>
      prev.map(e =>
        e.id === entryId
          ? { ...e, zhTranslation: trimmed || undefined, timestamp: now }
          : e
      )
    );
  }, []);

  const addToErrorBank = useCallback((entry: Omit<ErrorBankEntry, 'id' | 'timestamp' | 'resolved' | 'nextReviewAt' | 'reviewStage'> & { errorCategory?: ErrorCategory; nextReviewAt?: string | null; reviewStage?: number; reviewCueZh?: string }) => {
    const now = new Date();
    const nextReview = new Date(now.getTime() + ERROR_REVIEW_RESET_HOURS * MS_PER_HOUR).toISOString();
    const incomingNorm = normalizeErrorSentenceForDedupe(entry.originalSentence);
    const incomingKey = `${entry.collocationId}\0${incomingNorm}`;

    let resultEntry: ErrorBankEntry;

    setErrorBank(prev => {
      const dupId = errorDedupeIndexRef.current.get(incomingKey);
      const dupIdx = dupId
        ? prev.findIndex(e => e.id === dupId)
        : prev.findIndex(
            e =>
              !e.resolved &&
              e.collocationId === entry.collocationId &&
              normalizeErrorSentenceForDedupe(e.originalSentence) === incomingNorm
          );

      if (dupIdx !== -1) {
        const existing = prev[dupIdx];
        const mergedErrorTypes = Array.from(
          new Set([...existing.errorTypes, ...entry.errorTypes].map(t => t.trim()).filter(Boolean))
        );
        const mergedGrammarPoints = Array.from(
          new Set([...existing.grammarPoints, ...entry.grammarPoints].map(g => g.trim()).filter(Boolean))
        );
        resultEntry = {
          ...existing,
          timestamp: now.toISOString(),
          originalSentence: entry.originalSentence.trim() || existing.originalSentence,
          correctedSentence: entry.correctedSentence?.trim() || existing.correctedSentence,
          errorTypes: mergedErrorTypes.length ? mergedErrorTypes : existing.errorTypes,
          errorCategory: entry.errorCategory ?? existing.errorCategory,
          diagnosis: entry.diagnosis || existing.diagnosis,
          hint: entry.hint || existing.hint,
          grammarPoints: mergedGrammarPoints.length ? mergedGrammarPoints : existing.grammarPoints,
          reviewCueZh: entry.reviewCueZh ?? existing.reviewCueZh,
          nativeVersion: entry.nativeVersion ?? existing.nativeVersion,
          nativeThinking: entry.nativeThinking ?? existing.nativeThinking,
          reviewReproClozeDone: existing.reviewReproClozeDone,
        };
        const rest = prev.filter((_, i) => i !== dupIdx);
        return [resultEntry, ...rest];
      }

      resultEntry = {
        ...entry,
        id: newErrorBankEntryId(),
        timestamp: now.toISOString(),
        resolved: false,
        errorCategory: entry.errorCategory ?? 'grammar',
        nextReviewAt: entry.nextReviewAt ?? nextReview,
        reviewStage: entry.reviewStage ?? 0,
        reviewCueZh: entry.reviewCueZh,
      };
      return [resultEntry, ...prev];
    });

    return resultEntry!;
  }, []);

  const recordErrorReviewAttempt = useCallback((errorId: string) => {
    setErrorBank(prev =>
      prev.map(e => {
        if (e.id !== errorId) return e;
        return {
          ...e,
          reviewAttemptCount: (e.reviewAttemptCount ?? 0) + 1,
          lastReviewAttemptAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const resolveError = useCallback((errorId: string) => {
    clearErrorReviewProduceDraft(errorId);
    setErrorBank(prev =>
      prev.map(e =>
        e.id === errorId ? { ...e, resolved: true, reviewReproClozeDone: false } : e
      )
    );
  }, []);

  const removeErrorBankEntry = useCallback((errorId: string) => {
    clearErrorReviewProduceDraft(errorId);
    setErrorBank(prev => prev.filter(e => e.id !== errorId));
  }, []);

  const setErrorReviewReproClozeDone = useCallback((errorId: string, done: boolean) => {
    setErrorBank(prev =>
      prev.map(e => (e.id === errorId ? { ...e, reviewReproClozeDone: done } : e))
    );
  }, []);

  /** 极简复习：通过重测后安排下一轮 (24h -> 3d -> 7d) */
  const scheduleNextReview = useCallback((errorId: string) => {
    clearErrorReviewProduceDraft(errorId);
    setErrorBank(prev => prev.map(e => {
      if (e.id !== errorId || e.resolved) return e;
      const stage = e.reviewStage ?? 0;
      const nextStage = Math.min(stage + 1, 2);
      const hours = ERROR_REVIEW_STAGE_HOURS[nextStage] ?? ERROR_REVIEW_STAGE_HOURS[0];
      return {
        ...e,
        reviewStage: nextStage,
        nextReviewAt: new Date(Date.now() + hours * MS_PER_HOUR).toISOString(),
        reviewReproClozeDone: false,
      };
    }));
  }, []);

  /** 重测失败：重置为 24h 后再测 */
  const resetReview = useCallback((errorId: string) => {
    setErrorBank(prev => prev.map(e => {
      if (e.id !== errorId) return e;
      return {
        ...e,
        reviewStage: 0,
        nextReviewAt: new Date(Date.now() + ERROR_REVIEW_RESET_HOURS * MS_PER_HOUR).toISOString(),
      };
    }));
  }, []);

  const addStuckPoint = useCallback((entry: Omit<StuckPointEntry, 'id' | 'timestamp' | 'resolved'>) => {
    const newEntry: StuckPointEntry = {
      ...entry,
      id: newStuckPointId(),
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    setStuckPoints(prev => [newEntry, ...prev]);
    return newEntry;
  }, []);

  const resolveStuck = useCallback((stuckId: string) => {
    setStuckPoints(prev => prev.map(s => s.id === stuckId ? { ...s, resolved: true } : s));
  }, []);

  const clearAll = useCallback(() => {
    setCorpus([]);
    setErrorBank([]);
    setStuckPoints([]);
    setLearnedCollocations(new Set());
    setVocabCards([]);
    setFoundryExampleOverrides({});
  }, []);

  const addVocabCard = useCallback(
    (input: {
      headword: string;
      sense?: string;
      tags: string[];
      items: VocabCardItem[];
      spokenPracticePhrase?: string;
      writtenSupplement?: string;
      registerNoteZh?: string;
      spokenAlternatives?: string[];
      isCommonInSpokenEnglish?: boolean;
    }) => {
      const id = newVocabCardId();
      const now = new Date().toISOString();
      const items = input.items.map((it, i) => ({
        ...it,
        id: it.id || `${id}-i${i}`,
      }));
      const newCard: VocabCard = {
        id,
        timestamp: now,
        headword: input.headword.trim(),
        sense: input.sense?.trim() || undefined,
        spokenPracticePhrase: input.spokenPracticePhrase?.trim() || undefined,
        writtenSupplement: input.writtenSupplement?.trim() || undefined,
        registerNoteZh: input.registerNoteZh?.trim() || undefined,
        spokenAlternatives: input.spokenAlternatives?.length
          ? [...new Set(input.spokenAlternatives.map(s => s.trim()).filter(Boolean))]
          : undefined,
        isCommonInSpokenEnglish: input.isCommonInSpokenEnglish,
        tags: input.tags,
        items,
        source: 'ai_word_lab',
        lastViewedAt: null,
        nextDueAt: initialNextDueAt(),
        reviewStage: 0,
      };
      setVocabCards(prev => [newCard, ...prev]);
      return newCard;
    },
    []
  );

  const updateVocabCard = useCallback((cardId: string, patch: Partial<VocabCard>) => {
    setVocabCards(prev =>
      prev.map(c => (c.id === cardId ? { ...c, ...patch, id: c.id } : c))
    );
  }, []);

  const deleteVocabCard = useCallback((cardId: string) => {
    setVocabCards(prev => prev.filter(c => c.id !== cardId));
  }, []);

  /** 已浏览：清零「到期」节奏，按当前阶段推迟下次提醒 */
  const markVocabCardViewed = useCallback((cardId: string) => {
    const now = new Date().toISOString();
    setVocabCards(prev =>
      prev.map(c => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          lastViewedAt: now,
          nextDueAt: computeNextDueAfterView(c.reviewStage),
        };
      })
    );
  }, []);

  const markVocabCardRemembered = useCallback((cardId: string) => {
    const now = new Date().toISOString();
    setVocabCards(prev =>
      prev.map(c => {
        if (c.id !== cardId) return c;
        const { reviewStage, nextDueAt } = computeAfterRemembered(c.reviewStage);
        return { ...c, lastViewedAt: now, reviewStage, nextDueAt };
      })
    );
  }, []);

  const markVocabCardStruggled = useCallback((cardId: string) => {
    const now = new Date().toISOString();
    setVocabCards(prev =>
      prev.map(c => {
        if (c.id !== cardId) return c;
        const { reviewStage, nextDueAt } = computeAfterStruggled();
        return { ...c, lastViewedAt: now, reviewStage, nextDueAt };
      })
    );
  }, []);

  // ========== Cloud Sync ==========

  const pushToCloud = useCallback(async () => {
    if (!accessToken) {
      setSyncError('未登录，无法同步');
      setSyncStatus('error');
      return;
    }
    setSyncStatus('saving');
    setSyncError(null);
    try {
      const result = await syncSave(accessToken, {
        corpus,
        errorBank,
        stuckPoints,
        learnedCollocations: Array.from(learnedCollocations),
        vocabCards,
        foundryExampleOverrides,
      });
      const ts = result.timestamp;
      setLastSyncTime(ts);
      localStorage.setItem('ff_last_sync', ts);
      lastSyncedVersion.current = dataVersion.current;
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err: any) {
      console.error('Push to cloud failed:', err);
      setSyncError(err.message || 'Sync failed');
      setSyncStatus('error');
    }
  }, [accessToken, corpus, errorBank, stuckPoints, learnedCollocations, vocabCards, foundryExampleOverrides]);

  const pullFromCloud = useCallback(async () => {
    if (!accessToken) {
      setSyncError('未登录，无法同步');
      setSyncStatus('error');
      return;
    }
    setSyncStatus('loading');
    setSyncError(null);
    try {
      const data = await syncLoad(accessToken, lastSyncTime);
      const remoteVocab = (data.vocabCards || []).map(c => normalizeVocabCard(c));
      setCorpus(prev => mergeByIdNewerTimestamp(prev, data.corpus || []));
      setErrorBank(prev => mergeByIdNewerTimestamp(prev, data.errorBank || []));
      setStuckPoints(prev => mergeByIdNewerTimestamp(prev, data.stuckPoints || []));
      setLearnedCollocations(prev => mergeLearnedCollocationIds(prev, data.learnedCollocations));
      setVocabCards(prev => mergeByIdNewerTimestamp(prev, remoteVocab).map(c => normalizeVocabCard(c)));
      setFoundryExampleOverrides(prev =>
        mergeFoundryExampleOverrides(prev, normalizeFoundryExampleOverrides(data.foundryExampleOverrides))
      );
      const ts = data.serverTimestamp || new Date().toISOString();
      setLastSyncTime(ts);
      localStorage.setItem('ff_last_sync', ts);
      lastSyncedVersion.current = dataVersion.current;
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err: any) {
      console.error('Pull from cloud failed:', err);
      setSyncError(err.message || 'Load failed');
      setSyncStatus('error');
    }
  }, [accessToken, lastSyncTime]);

  // Auto-pull from cloud on first login
  useEffect(() => {
    if (!autoSyncEnabled) return;
    if (accessToken && !initialPullDone.current) {
      initialPullDone.current = true;
      (async () => {
        setSyncStatus('loading');
        setSyncError(null);
        try {
          const data = await syncLoad(accessToken, lastSyncTime);
          const hasCloudData =
            (data.corpus?.length > 0) ||
            (data.errorBank?.length > 0) ||
            (data.stuckPoints?.length > 0) ||
            (data.learnedCollocations?.length > 0) ||
            ((data.vocabCards?.length ?? 0) > 0) ||
            Object.keys(normalizeFoundryExampleOverrides(data.foundryExampleOverrides)).length > 0;
          if (hasCloudData) {
            const remoteVocab = (data.vocabCards || []).map(c => normalizeVocabCard(c));
            setCorpus(prev => mergeByIdNewerTimestamp(prev, data.corpus || []));
            setErrorBank(prev => mergeByIdNewerTimestamp(prev, data.errorBank || []));
            setStuckPoints(prev => mergeByIdNewerTimestamp(prev, data.stuckPoints || []));
            setLearnedCollocations(prev => mergeLearnedCollocationIds(prev, data.learnedCollocations));
            setVocabCards(prev =>
              mergeByIdNewerTimestamp(prev, remoteVocab).map(c => normalizeVocabCard(c))
            );
            setFoundryExampleOverrides(prev =>
              mergeFoundryExampleOverrides(prev, normalizeFoundryExampleOverrides(data.foundryExampleOverrides))
            );
          }
          const ts = data.serverTimestamp || new Date().toISOString();
          setLastSyncTime(ts);
          localStorage.setItem('ff_last_sync', ts);
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err: any) {
          console.error('Initial pull from cloud failed:', err);
          const msg = err?.message || 'Initial sync failed';
          setSyncError(msg);
          // If the session is invalid/expired, surface error and stop auto retry loops.
          if (/invalid jwt/i.test(msg) || /session expired/i.test(msg)) {
            setSyncStatus('error');
            return;
          }
          setSyncStatus('idle');
        }
      })();
    }
    if (!accessToken) {
      initialPullDone.current = false;
    }
  }, [accessToken, autoSyncEnabled, lastSyncTime]);

  // Track data version changes
  useEffect(() => {
    dataVersion.current += 1;
  }, [corpus, errorBank, stuckPoints, learnedCollocations, vocabCards, foundryExampleOverrides]);

  const vocabDueCount = useMemo(
    () => vocabCards.filter(c => isVocabCardDue(c.nextDueAt)).length,
    [vocabCards]
  );

  // Auto debounce sync: when data changes and user is logged in
  useEffect(() => {
    if (!accessToken) return;
    if (!autoSyncEnabled) return;
    // If auth/session is broken, do not keep auto-syncing.
    if (syncStatus === 'error' && syncError && (/invalid jwt/i.test(syncError) || /session expired/i.test(syncError))) {
      return;
    }
    if (dataVersion.current <= 2) return;
    if (dataVersion.current === lastSyncedVersion.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setSyncStatus('saving');
      setSyncError(null);
      try {
        const result = await syncSave(accessToken, {
          corpus,
          errorBank,
          stuckPoints,
          learnedCollocations: Array.from(learnedCollocations),
          vocabCards,
          foundryExampleOverrides,
        });
        const ts = result.timestamp;
        setLastSyncTime(ts);
        localStorage.setItem('ff_last_sync', ts);
        lastSyncedVersion.current = dataVersion.current;
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (err: any) {
        console.error('Auto sync failed:', err);
        setSyncError(err.message || 'Auto sync failed');
        setSyncStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [
    accessToken,
    corpus,
    errorBank,
    stuckPoints,
    learnedCollocations,
    vocabCards,
    foundryExampleOverrides,
    syncStatus,
    syncError,
    autoSyncEnabled,
  ]);

  return {
    corpus,
    errorBank,
    stuckPoints,
    learnedCollocations,
    vocabCards,
    foundryExampleOverrides,
    setFoundryExamplesForCollocation,
    clearFoundryExamplesForCollocation,
    vocabDueCount,
    markAsLearned,
    unmarkAsLearned,
    addToCorpus,
    removeCorpusEntry,
    setCorpusEntryZhTranslation,
    addToErrorBank,
    recordErrorReviewAttempt,
    setErrorReviewReproClozeDone,
    resolveError,
    removeErrorBankEntry,
    scheduleNextReview,
    resetReview,
    addStuckPoint,
    resolveStuck,
    addVocabCard,
    updateVocabCard,
    deleteVocabCard,
    markVocabCardViewed,
    markVocabCardRemembered,
    markVocabCardStruggled,
    clearAll,
    // Sync
    syncStatus,
    lastSyncTime,
    syncError,
    pushToCloud,
    pullFromCloud,
    autoSyncEnabled,
    setAutoSyncEnabled,
    isLoggedIn: !!accessToken,
    stats: {
      totalLearned: learnedCollocations.size,
      corpusSize: corpus.length,
      errorCount: errorBank.filter(e => !e.resolved).length,
      stuckCount: stuckPoints.length,
      vocabCardCount: vocabCards.length,
      vocabDueCount,
    },
  };
}

export type AppStore = ReturnType<typeof useAppStore>;