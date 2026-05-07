import { requestJson } from '../../platform/request';
import { getStorageJson, setStorageJson } from '../../platform/storage';
import type { CorpusEntry, LearningState, StuckPointEntry, VocabCard } from './types';
import type { VocabCardItem, VocabCardRegisterGuide } from './types';

const CORPUS_KEY = 'verbalab_weapp_corpus';
const STUCK_POINTS_KEY = 'verbalab_weapp_stuck_points';
const VOCAB_CARDS_KEY = 'verbalab_weapp_vocab_cards';
const SYNC_META_KEY = 'verbalab_weapp_sync_meta';

type SyncLoadResult = {
  corpus?: CorpusEntry[];
  stuckPoints?: StuckPointEntry[];
  vocabCards?: VocabCard[];
  serverTimestamp?: string;
};

type SyncSavePayload = {
  corpus: CorpusEntry[];
  errorBank: unknown[];
  stuckPoints: StuckPointEntry[];
  learnedCollocations: string[];
  vocabCards: VocabCard[];
  foundryExampleOverrides: Record<string, never>;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function mergeByTimestamp<T extends { id: string; timestamp: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of remote || []) {
    if (item?.id) byId.set(item.id, item);
  }
  for (const item of local || []) {
    if (!item?.id) continue;
    const existing = byId.get(item.id);
    byId.set(item.id, !existing || item.timestamp >= existing.timestamp ? item : existing);
  }
  return [...byId.values()].sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}

function pickReviewWinner(local: VocabCard, remote: VocabCard): VocabCard {
  const localViewed = String(local.lastViewedAt || '');
  const remoteViewed = String(remote.lastViewedAt || '');
  if (localViewed !== remoteViewed) return localViewed > remoteViewed ? local : remote;
  if ((local.reviewStage ?? 0) !== (remote.reviewStage ?? 0)) {
    return (local.reviewStage ?? 0) > (remote.reviewStage ?? 0) ? local : remote;
  }
  return String(local.timestamp || '') >= String(remote.timestamp || '') ? local : remote;
}

function mergeItemsWithReviewChunks(content: VocabCard, local: VocabCard, remote: VocabCard): VocabCard {
  const candidates = [...(local.items || []), ...(remote.items || [])];
  const items = (content.items || []).map((item) => {
    if (item.reviewChunks?.length) return item;
    const source = candidates.find((candidate) => {
      if (!candidate.reviewChunks?.length) return false;
      return (
        (item.id && candidate.id === item.id) ||
        (item.sentence && candidate.sentence === item.sentence)
      );
    });
    return source ? { ...item, reviewChunks: source.reviewChunks } : item;
  });
  return { ...content, items };
}

function mergeVocabCards(local: VocabCard[], remote: VocabCard[]): VocabCard[] {
  const byId = new Map<string, VocabCard>();
  for (const card of remote || []) {
    if (card?.id) byId.set(card.id, card);
  }
  for (const card of local || []) {
    if (!card?.id) continue;
    const existing = byId.get(card.id);
    if (!existing) {
      byId.set(card.id, card);
      continue;
    }
    const content = mergeItemsWithReviewChunks(
      card.timestamp >= existing.timestamp ? card : existing,
      card,
      existing,
    );
    const review = pickReviewWinner(card, existing);
    byId.set(card.id, {
      ...content,
      lastViewedAt: review.lastViewedAt ?? content.lastViewedAt ?? null,
      nextDueAt: review.nextDueAt ?? content.nextDueAt ?? null,
      reviewStage: typeof review.reviewStage === 'number' ? review.reviewStage : content.reviewStage || 0,
      timestamp: [content.timestamp, review.timestamp, review.lastViewedAt || ''].sort().at(-1) || content.timestamp,
    });
  }
  return [...byId.values()].sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}

export function getLearningState(): LearningState {
  const syncMeta = getStorageJson<{ lastSyncedAt?: string }>(SYNC_META_KEY, {});
  return {
    corpus: getStorageJson<CorpusEntry[]>(CORPUS_KEY, []),
    stuckPoints: getStorageJson<StuckPointEntry[]>(STUCK_POINTS_KEY, []),
    vocabCards: getStorageJson<VocabCard[]>(VOCAB_CARDS_KEY, []),
    lastSyncedAt: syncMeta.lastSyncedAt,
  };
}

export function setLearningState(state: Partial<LearningState>) {
  if (state.corpus) setStorageJson(CORPUS_KEY, state.corpus);
  if (state.stuckPoints) setStorageJson(STUCK_POINTS_KEY, state.stuckPoints);
  if (state.vocabCards) setStorageJson(VOCAB_CARDS_KEY, state.vocabCards);
  if (state.lastSyncedAt) setStorageJson(SYNC_META_KEY, { lastSyncedAt: state.lastSyncedAt });
}

export function clearLearningState() {
  setStorageJson(CORPUS_KEY, []);
  setStorageJson(STUCK_POINTS_KEY, []);
  setStorageJson(VOCAB_CARDS_KEY, []);
  setStorageJson(SYNC_META_KEY, {});
}

function buildSyncPayload(state: LearningState): SyncSavePayload {
  return {
    corpus: state.corpus,
    errorBank: [],
    stuckPoints: state.stuckPoints,
    learnedCollocations: [],
    vocabCards: state.vocabCards,
    foundryExampleOverrides: {},
  };
}

export async function pushLearningState(): Promise<LearningState> {
  const local = getLearningState();
  await requestJson<{ success: boolean; timestamp: string }>({
    method: 'POST',
    path: '/sync/replace',
    data: {
      stuckPoints: local.stuckPoints,
      vocabCards: local.vocabCards,
    },
  });
  setLearningState({ lastSyncedAt: new Date().toISOString() });
  return getLearningState();
}

export function saveExpressionToLocal(input: {
  chineseThought: string;
  sentence: string;
  chinese?: string;
  noteZh?: string;
  recommendedExpression?: string;
  guidanceZh?: string;
}): LearningState {
  const now = new Date().toISOString();
  const current = getLearningState();
  const corpusEntry: CorpusEntry = {
    id: createId('corpus'),
    timestamp: now,
    verbId: 'stuck-free',
    verb: 'free',
    collocationId: input.recommendedExpression || 'free-expression',
    collocation: input.recommendedExpression || 'free expression',
    userSentence: input.sentence,
    isCorrect: true,
    mode: 'stuck',
    tags: ['小程序', '卡壳点'],
    nativeThinking: input.noteZh || input.guidanceZh,
    zhTranslation: input.chinese,
  };
  const stuckPoint: StuckPointEntry = {
    id: createId('stuck'),
    timestamp: now,
    chineseThought: input.chineseThought,
    englishAttempt: input.sentence,
    aiSuggestion: input.guidanceZh || input.noteZh || input.sentence,
    recommendedExpression: input.recommendedExpression,
    resolved: true,
    sourceMode: 'free',
  };
  const next = {
    ...current,
    corpus: [corpusEntry, ...current.corpus],
    stuckPoints: [stuckPoint, ...current.stuckPoints],
  };
  setLearningState(next);
  return next;
}

function addDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

const VOCAB_REVIEW_INTERVAL_DAYS = [1, 2, 4, 7, 15, 30] as const;

function vocabReviewDaysForStage(stage: number): number {
  const safeStage = Math.min(Math.max(stage, 0), VOCAB_REVIEW_INTERVAL_DAYS.length - 1);
  return VOCAB_REVIEW_INTERVAL_DAYS[safeStage];
}

export function saveVocabCardToLocal(input: {
  headword: string;
  sense?: string;
  tags: string[];
  items: Array<Omit<VocabCardItem, 'id'> & { id?: string }>;
  spokenPracticePhrase?: string;
  writtenSupplement?: string | null;
  registerNoteZh?: string;
  registerGuide?: VocabCardRegisterGuide;
  spokenAlternatives?: string[];
  isCommonInSpokenEnglish?: boolean;
}): { state: LearningState; card: VocabCard } {
  const now = new Date().toISOString();
  const id = createId('vocab');
  const card: VocabCard = {
    id,
    timestamp: now,
    headword: input.headword.trim(),
    sense: input.sense?.trim() || undefined,
    spokenPracticePhrase: input.spokenPracticePhrase?.trim() || undefined,
    writtenSupplement: input.writtenSupplement?.trim() || undefined,
    registerNoteZh: input.registerNoteZh?.trim() || undefined,
    registerGuide: input.registerGuide,
    spokenAlternatives: input.spokenAlternatives?.length
      ? [...new Set(input.spokenAlternatives.map((item) => item.trim()).filter(Boolean))]
      : undefined,
    isCommonInSpokenEnglish: input.isCommonInSpokenEnglish,
    tags: input.tags,
    items: input.items.map((item, index) => ({
      ...item,
      id: item.id || `${id}-i${index}`,
    })),
    source: 'ai_word_lab',
    lastViewedAt: null,
    nextDueAt: addDays(vocabReviewDaysForStage(0)),
    reviewStage: 0,
  };
  const current = getLearningState();
  const next = {
    ...current,
    vocabCards: [card, ...current.vocabCards],
  };
  setLearningState(next);
  return { state: next, card };
}

export async function syncLearningState(): Promise<LearningState> {
  const local = getLearningState();
  const remote = await requestJson<SyncLoadResult>({
    method: 'GET',
    path: '/sync/load',
  });
  const merged: LearningState = {
    corpus: mergeByTimestamp(local.corpus, remote.corpus || []),
    stuckPoints: mergeByTimestamp(local.stuckPoints, remote.stuckPoints || []),
    vocabCards: mergeVocabCards(local.vocabCards, remote.vocabCards || []),
    lastSyncedAt: new Date().toISOString(),
  };
  setLearningState(merged);
  await requestJson<{ success: boolean; timestamp: string }>({
    method: 'POST',
    path: '/sync/save',
    data: buildSyncPayload(merged),
  });
  setLearningState({ lastSyncedAt: new Date().toISOString() });
  return getLearningState();
}

export function deleteStuckPointFromLocal(stuckPointId: string): LearningState {
  const current = getLearningState();
  const next = {
    ...current,
    stuckPoints: current.stuckPoints.filter((item) => item.id !== stuckPointId),
  };
  setLearningState(next);
  return next;
}

export function deleteVocabCardFromLocal(cardId: string): LearningState {
  const current = getLearningState();
  const next = {
    ...current,
    vocabCards: current.vocabCards.filter((card) => card.id !== cardId),
  };
  setLearningState(next);
  return next;
}

export function updateVocabReview(cardId: string, result: 'remembered' | 'struggled'): LearningState {
  const now = new Date().toISOString();
  const current = getLearningState();
  const vocabCards = current.vocabCards.map((card) => {
    if (card.id !== cardId) return card;
    if (result === 'remembered') {
      const reviewStage = Math.min((card.reviewStage || 0) + 1, VOCAB_REVIEW_INTERVAL_DAYS.length - 1);
      return { ...card, timestamp: now, lastViewedAt: now, reviewStage, nextDueAt: addDays(vocabReviewDaysForStage(reviewStage)) };
    }
    return { ...card, timestamp: now, lastViewedAt: now, reviewStage: 0, nextDueAt: addDays(1) };
  });
  const next = { ...current, vocabCards };
  setLearningState(next);
  return next;
}

export function getDueVocabCards(cards: VocabCard[], limit = 20): VocabCard[] {
  const now = new Date().toISOString();
  return [...cards]
    .sort((a, b) => {
      const aDue = a.nextDueAt && a.nextDueAt <= now ? 0 : 1;
      const bDue = b.nextDueAt && b.nextDueAt <= now ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
    })
    .slice(0, limit);
}
