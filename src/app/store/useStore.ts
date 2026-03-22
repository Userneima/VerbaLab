import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { syncSave, syncLoad } from '../utils/api';
import {
  computeNextDueAfterView,
  computeAfterRemembered,
  computeAfterStruggled,
  initialNextDueAt,
  isVocabCardDue,
} from '../utils/vocabCardReview';

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
}

export interface StuckPointEntry {
  id: string;
  timestamp: string;
  chineseThought: string;
  englishAttempt: string;
  aiSuggestion: string;
  resolved: boolean;
}

/** 语料库学习模块：单词卡 · 一题一句（与实验室造句语料 CorpusEntry 分立） */
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
  tags: string[];
  items: VocabCardItem[];
  source: 'ai_word_lab';
  lastViewedAt: string | null;
  nextDueAt: string | null;
  reviewStage: number;
}

function normalizeVocabCardItem(raw: any, idx: number, cardId: string): VocabCardItem {
  return {
    id: String(raw?.id || `${cardId}-i${idx}`),
    questionId: String(raw?.questionId || ''),
    part: Number(raw?.part) || 1,
    topic: String(raw?.topic || ''),
    questionSnapshot: String(raw?.questionSnapshot || ''),
    sentence: String(raw?.sentence || ''),
    collocationsUsed: Array.isArray(raw?.collocationsUsed)
      ? raw.collocationsUsed.map((x: any) => String(x))
      : [],
    chinese: raw?.chinese ? String(raw.chinese) : undefined,
  };
}

function normalizeVocabCard(raw: any): VocabCard {
  const id = String(raw?.id || `VC${Date.now()}`);
  const items = Array.isArray(raw?.items)
    ? raw.items.map((it: any, i: number) => normalizeVocabCardItem(it, i, id))
    : [];
  return {
    id,
    timestamp: String(raw?.timestamp || new Date().toISOString()),
    headword: String(raw?.headword || ''),
    sense: raw?.sense ? String(raw.sense) : undefined,
    tags: Array.isArray(raw?.tags) ? raw.tags.map((t: any) => String(t)) : [],
    items,
    source: 'ai_word_lab',
    lastViewedAt: raw?.lastViewedAt != null ? String(raw.lastViewedAt) : null,
    nextDueAt: raw?.nextDueAt != null ? String(raw.nextDueAt) : null,
    reviewStage: typeof raw?.reviewStage === 'number' ? raw.reviewStage : 0,
  };
}

export interface LearningProgress {
  learnedCollocations: Set<string>;
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (key === 'ff_learned' && Array.isArray(parsed)) {
        return new Set(parsed) as unknown as T;
      }
      if (key === 'ff_errors' && Array.isArray(parsed)) {
        const now = new Date().toISOString();
        const next24 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        return parsed.map((e: any) => ({
          ...e,
          errorCategory: e.errorCategory ?? 'grammar',
          nextReviewAt: e.nextReviewAt ?? (e.resolved ? null : next24),
          reviewStage: e.reviewStage ?? 0,
          nativeVersion: e.nativeVersion,
          nativeThinking: e.nativeThinking,
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
  const [vocabCards, setVocabCards] = useState<VocabCard[]>(() =>
    loadFromStorage<VocabCard[]>('ff_vocab_cards', [])
  );

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
  // Debounce timer ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track data version changes for auto-sync
  const dataVersion = useRef(0);
  const lastSyncedVersion = useRef(0);

  // Persist to localStorage
  useEffect(() => { saveToStorage('ff_corpus', corpus); }, [corpus]);
  useEffect(() => { saveToStorage('ff_errors', errorBank); }, [errorBank]);
  useEffect(() => { saveToStorage('ff_stuck', stuckPoints); }, [stuckPoints]);
  useEffect(() => { saveToStorage('ff_learned', learnedCollocations); }, [learnedCollocations]);
  useEffect(() => { saveToStorage('ff_vocab_cards', vocabCards); }, [vocabCards]);

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
    const newEntry: CorpusEntry = {
      ...entry,
      id: `S${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setCorpus(prev => [newEntry, ...prev]);
    return newEntry;
  }, []);

  const addToErrorBank = useCallback((entry: Omit<ErrorBankEntry, 'id' | 'timestamp' | 'resolved' | 'nextReviewAt' | 'reviewStage'> & { errorCategory?: ErrorCategory; nextReviewAt?: string | null; reviewStage?: number }) => {
    const now = new Date();
    const nextReview = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const newEntry: ErrorBankEntry = {
      ...entry,
      id: `E${Date.now()}`,
      timestamp: now.toISOString(),
      resolved: false,
      errorCategory: entry.errorCategory ?? 'grammar',
      nextReviewAt: entry.nextReviewAt ?? nextReview,
      reviewStage: entry.reviewStage ?? 0,
    };
    setErrorBank(prev => [newEntry, ...prev]);
    return newEntry;
  }, []);

  const resolveError = useCallback((errorId: string) => {
    setErrorBank(prev => prev.map(e => e.id === errorId ? { ...e, resolved: true } : e));
  }, []);

  /** 极简复习：通过重测后安排下一轮 (24h -> 3d -> 7d) */
  const scheduleNextReview = useCallback((errorId: string) => {
    setErrorBank(prev => prev.map(e => {
      if (e.id !== errorId || e.resolved) return e;
      const stage = e.reviewStage ?? 0;
      const nextStage = Math.min(stage + 1, 2);
      const hours = nextStage === 0 ? 24 : nextStage === 1 ? 24 * 3 : 24 * 7;
      return {
        ...e,
        reviewStage: nextStage,
        nextReviewAt: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
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
        nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }));
  }, []);

  const addStuckPoint = useCallback((entry: Omit<StuckPointEntry, 'id' | 'timestamp' | 'resolved'>) => {
    const newEntry: StuckPointEntry = {
      ...entry,
      id: `ST${Date.now()}`,
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
  }, []);

  const addVocabCard = useCallback(
    (input: { headword: string; sense?: string; tags: string[]; items: VocabCardItem[] }) => {
      const id = `VC${Date.now()}`;
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
  }, [accessToken, corpus, errorBank, stuckPoints, learnedCollocations, vocabCards]);

  const pullFromCloud = useCallback(async () => {
    if (!accessToken) {
      setSyncError('未登录，无法同步');
      setSyncStatus('error');
      return;
    }
    setSyncStatus('loading');
    setSyncError(null);
    try {
      const data = await syncLoad(accessToken);
      setCorpus(data.corpus || []);
      setErrorBank(data.errorBank || []);
      setStuckPoints(data.stuckPoints || []);
      setLearnedCollocations(new Set(data.learnedCollocations || []));
      setVocabCards((data.vocabCards || []).map((c: any) => normalizeVocabCard(c)));
      const ts = new Date().toISOString();
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
  }, [accessToken]);

  // Auto-pull from cloud on first login
  useEffect(() => {
    if (!autoSyncEnabled) return;
    if (accessToken && !initialPullDone.current) {
      initialPullDone.current = true;
      (async () => {
        setSyncStatus('loading');
        setSyncError(null);
        try {
          const data = await syncLoad(accessToken);
          const hasCloudData =
            (data.corpus?.length > 0) ||
            (data.errorBank?.length > 0) ||
            (data.stuckPoints?.length > 0) ||
            (data.learnedCollocations?.length > 0) ||
            (data.vocabCards?.length > 0);
          if (hasCloudData) {
            setCorpus(data.corpus || []);
            setErrorBank(data.errorBank || []);
            setStuckPoints(data.stuckPoints || []);
            setLearnedCollocations(new Set(data.learnedCollocations || []));
            setVocabCards((data.vocabCards || []).map((c: any) => normalizeVocabCard(c)));
          }
          const ts = new Date().toISOString();
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
  }, [accessToken]);

  // Track data version changes
  useEffect(() => {
    dataVersion.current += 1;
  }, [corpus, errorBank, stuckPoints, learnedCollocations, vocabCards]);

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
  }, [accessToken, corpus, errorBank, stuckPoints, learnedCollocations, vocabCards, syncStatus, syncError, autoSyncEnabled]);

  return {
    corpus,
    errorBank,
    stuckPoints,
    learnedCollocations,
    vocabCards,
    vocabDueCount,
    markAsLearned,
    unmarkAsLearned,
    addToCorpus,
    addToErrorBank,
    resolveError,
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
      stuckCount: stuckPoints.filter(s => !s.resolved).length,
      vocabCardCount: vocabCards.length,
      vocabDueCount,
    },
  };
}

export type AppStore = ReturnType<typeof useAppStore>;