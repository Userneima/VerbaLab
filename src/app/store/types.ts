import type { FoundryExampleOverridePack } from '../utils/syncMerge';
import {
  ERROR_REVIEW_RESET_HOURS,
  MS_PER_HOUR,
} from '../utils/reviewConfig';

export interface CorpusEntry {
  id: string;
  timestamp: string;
  verbId: string;
  verb: string;
  collocationId: string;
  collocation: string;
  userSentence: string;
  isCorrect: boolean;
  mode: 'test' | 'field' | 'stuck';
  tags: string[];
  nativeVersion?: string;
  nativeThinking?: string;
  isChinglish?: boolean;
  zhTranslation?: string;
}

export type ErrorCategory = 'grammar' | 'collocation' | 'chinglish';

export interface ErrorBankEntry {
  id: string;
  timestamp: string;
  verbId: string;
  verb: string;
  collocationId: string;
  collocation: string;
  originalSentence: string;
  correctedSentence?: string;
  errorTypes: string[];
  errorCategory: ErrorCategory;
  diagnosis: string;
  hint: string;
  grammarPoints: string[];
  resolved: boolean;
  nativeVersion?: string;
  nativeThinking?: string;
  nextReviewAt: string | null;
  reviewStage: number;
  reviewCueZh?: string;
  reviewAttemptCount?: number;
  lastReviewAttemptAt?: string;
  reviewReproClozeDone?: boolean;
}

export interface StuckPointEntry {
  id: string;
  timestamp: string;
  chineseThought: string;
  englishAttempt: string;
  aiSuggestion: string;
  resolved: boolean;
  sourceMode?: 'test' | 'field' | 'free';
  contextCollocation?: string;
}

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

export interface VocabCardRegisterAlternative {
  phrase: string;
  labelZh: string;
  usageZh?: string;
}

export interface VocabCardRegisterGuide {
  anchorZh: string;
  alternatives: VocabCardRegisterAlternative[];
  compareExamples?: {
    original: string;
    spoken: string;
  };
  pitfalls?: string[];
  coreCollocations?: string[];
  tagHints?: string[];
}

export interface VocabCard {
  id: string;
  timestamp: string;
  headword: string;
  sense?: string;
  spokenPracticePhrase?: string;
  writtenSupplement?: string;
  registerNoteZh?: string;
  registerGuide?: VocabCardRegisterGuide;
  spokenAlternatives?: string[];
  isCommonInSpokenEnglish?: boolean;
  tags: string[];
  items: VocabCardItem[];
  source: 'ai_word_lab';
  lastViewedAt: string | null;
  nextDueAt: string | null;
  reviewStage: number;
}

export interface LearningProgress {
  learnedCollocations: Set<string>;
}

export function normalizeVocabCardItem(raw: unknown, idx: number, cardId: string): VocabCardItem {
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

export function normalizeRegisterGuide(raw: unknown): VocabCardRegisterGuide | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const guide = raw as Record<string, unknown>;
  const anchorZh = String(guide.anchorZh ?? '').trim();
  const alternativesRaw = guide.alternatives;
  const alternatives = Array.isArray(alternativesRaw)
    ? alternativesRaw
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
          const alt = item as Record<string, unknown>;
          const phrase = String(alt.phrase ?? '').trim();
          const labelZh = String(alt.labelZh ?? '').trim();
          if (!phrase || !labelZh) return null;
          const usageZh = String(alt.usageZh ?? '').trim();
          return {
            phrase,
            labelZh,
            usageZh: usageZh || undefined,
          };
        })
        .filter(Boolean) as VocabCardRegisterAlternative[]
    : [];
  const compareRaw = guide.compareExamples;
  const compareExamples =
    compareRaw && typeof compareRaw === 'object' && !Array.isArray(compareRaw)
      ? (() => {
          const example = compareRaw as Record<string, unknown>;
          const original = String(example.original ?? '').trim();
          const spoken = String(example.spoken ?? '').trim();
          return original && spoken ? { original, spoken } : undefined;
        })()
      : undefined;
  const pitfalls = Array.isArray(guide.pitfalls)
    ? (guide.pitfalls as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const coreCollocations = Array.isArray(guide.coreCollocations)
    ? (guide.coreCollocations as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const tagHints = Array.isArray(guide.tagHints)
    ? (guide.tagHints as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : undefined;

  if (
    !anchorZh &&
    alternatives.length === 0 &&
    !compareExamples &&
    !pitfalls?.length &&
    !coreCollocations?.length
  ) {
    return undefined;
  }

  return {
    anchorZh,
    alternatives,
    compareExamples,
    pitfalls: pitfalls?.length ? pitfalls : undefined,
    coreCollocations: coreCollocations?.length ? coreCollocations : undefined,
    tagHints: tagHints?.length ? tagHints : undefined,
  };
}

export function normalizeVocabCard(raw: unknown): VocabCard {
  const r = raw as Record<string, unknown>;
  const id = String(r?.id || crypto.randomUUID());
  const rawItems = r?.items;
  const items = Array.isArray(rawItems)
    ? rawItems.map((it: unknown, i: number) => normalizeVocabCardItem(it, i, id))
    : [];
  const altRaw = r?.spokenAlternatives;
  const registerGuide = normalizeRegisterGuide(r?.registerGuide);
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
    registerGuide,
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

export function normalizeFoundryExampleOverrides(
  raw: unknown,
): Record<string, FoundryExampleOverridePack> {
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

export function normalizeLegacyErrorEntry(entry: any): ErrorBankEntry {
  const next24 = new Date(Date.now() + ERROR_REVIEW_RESET_HOURS * MS_PER_HOUR).toISOString();
  return {
    ...entry,
    errorCategory: entry.errorCategory ?? 'grammar',
    nextReviewAt: entry.nextReviewAt ?? (entry.resolved ? null : next24),
    reviewStage: entry.reviewStage ?? 0,
    nativeVersion: entry.nativeVersion,
    nativeThinking: entry.nativeThinking,
    reviewCueZh: entry.reviewCueZh,
    reviewAttemptCount: entry.reviewAttemptCount,
    lastReviewAttemptAt: entry.lastReviewAttemptAt,
    reviewReproClozeDone: entry.reviewReproClozeDone,
  };
}
