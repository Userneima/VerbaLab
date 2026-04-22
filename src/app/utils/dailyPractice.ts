import type {
  CorpusEntry,
  ErrorBankEntry,
  StuckPointEntry,
  VocabCard,
} from '../store/types';
import { isVocabCardDue } from './vocabCardReview';

export type LearningActivityKind = 'corpus' | 'error' | 'stuck' | 'vocabCard' | 'review';

export type LearningActivity = {
  id: string;
  dayKey: string;
  occurredAt: string;
  title: string;
  detail: string;
  kind: LearningActivityKind;
  sceneLabel: string;
  path: string;
};

export type DailyTaskId = 'lab' | 'field' | 'vocab' | 'error';

export type DailyPracticeTask = {
  id: DailyTaskId;
  title: string;
  description: string;
  sceneLabel: string;
  path: string;
  status: 'done' | 'pending';
  completedUnits: number;
  totalUnits: number;
  targetLabel: string;
  progressLabel: string;
  previewItems: string[];
};

export type DailyPracticeSummary = {
  learningActivities: LearningActivity[];
  tasks: DailyPracticeTask[];
  completedCount: number;
  remainingCount: number;
  focusTask: DailyPracticeTask | null;
  resumeActivity: LearningActivity | null;
  todayActivityCount: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDayKey(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function buildLearningActivities(
  corpus: CorpusEntry[],
  errorBank: ErrorBankEntry[],
  stuckPoints: StuckPointEntry[],
  vocabCards: VocabCard[],
): LearningActivity[] {
  const corpusActivities: LearningActivity[] = corpus.map((entry) => ({
    id: `corpus-${entry.id}`,
    dayKey: toDayKey(entry.timestamp),
    occurredAt: entry.timestamp,
    title: `${entry.mode === 'field' ? '实战仓' : '实验室'} · ${entry.collocation}`,
    detail: entry.userSentence,
    kind: 'corpus',
    sceneLabel: entry.mode === 'field' ? '雅思表达' : '句子热身',
    path: `/corpus?sentence=${encodeURIComponent(entry.id)}`,
  }));

  const errorActivities: LearningActivity[] = errorBank.map((entry) => ({
    id: `error-${entry.id}`,
    dayKey: toDayKey(entry.timestamp),
    occurredAt: entry.timestamp,
    title: `实验室错题 · ${entry.collocation}`,
    detail: entry.correctedSentence || entry.originalSentence,
    kind: 'error',
    sceneLabel: '错题回收',
    path: `/errors?highlight=${encodeURIComponent(entry.id)}`,
  }));

  const stuckActivities: LearningActivity[] = stuckPoints.map((entry) => ({
    id: `stuck-${entry.id}`,
    dayKey: toDayKey(entry.timestamp),
    occurredAt: entry.timestamp,
    title: `${entry.sourceMode === 'field' ? '实战仓' : '实验室'}卡壳点 · ${entry.contextCollocation || '表达求助'}`,
    detail: entry.chineseThought,
    kind: 'stuck',
    sceneLabel: entry.sourceMode === 'field' ? '雅思答题' : '句子起步',
    path: '/stuck',
  }));

  const vocabActivities: LearningActivity[] = vocabCards.flatMap((card) => {
    const firstItem = card.items[0];
    const questionContext =
      firstItem?.part && firstItem.part > 0
        ? `雅思 Part ${firstItem.part}${firstItem.topic ? ` · ${firstItem.topic}` : ''}`
        : firstItem?.topic || card.sense?.trim() || '词卡收录';

    const created: LearningActivity = {
      id: `vocab-${card.id}`,
      dayKey: toDayKey(card.timestamp),
      occurredAt: card.timestamp,
      title: `新词卡 · ${card.headword}`,
      detail: questionContext,
      kind: 'vocabCard',
      sceneLabel: '表达选词',
      path: `/vocab/${card.id}`,
    };

    const reviewed = card.lastViewedAt
      ? [
          {
            id: `review-${card.id}-${card.lastViewedAt}`,
            dayKey: toDayKey(card.lastViewedAt),
            occurredAt: card.lastViewedAt,
            title: `复习词卡 · ${card.headword}`,
            detail:
              (firstItem?.part && firstItem.part > 0
                ? `雅思 Part ${firstItem.part}`
                : null) || `阶段 ${card.reviewStage}`,
            kind: 'review' as const,
            sceneLabel: '今日复习',
            path: `/vocab/${card.id}`,
          },
        ]
      : [];

    return [created, ...reviewed];
  });

  return [...corpusActivities, ...errorActivities, ...stuckActivities, ...vocabActivities].sort(
    (a, b) => b.occurredAt.localeCompare(a.occurredAt),
  );
}

function countTodayLabActivity(corpus: CorpusEntry[], errorBank: ErrorBankEntry[], stuck: StuckPointEntry[], todayKey: string) {
  let count = 0;
  count += corpus.filter((entry) => entry.mode === 'test' && toDayKey(entry.timestamp) === todayKey).length;
  count += errorBank.filter((entry) => toDayKey(entry.timestamp) === todayKey).length;
  count += stuck.filter((entry) => entry.sourceMode !== 'field' && toDayKey(entry.timestamp) === todayKey).length;
  return count;
}

function countTodayFieldActivity(corpus: CorpusEntry[], stuck: StuckPointEntry[], todayKey: string) {
  let count = 0;
  count += corpus.filter((entry) => entry.mode === 'field' && toDayKey(entry.timestamp) === todayKey).length;
  count += stuck.filter((entry) => entry.sourceMode === 'field' && toDayKey(entry.timestamp) === todayKey).length;
  return count;
}

export function buildDailyPracticeSummary(params: {
  corpus: CorpusEntry[];
  errorBank: ErrorBankEntry[];
  stuckPoints: StuckPointEntry[];
  vocabCards: VocabCard[];
  today?: Date;
}): DailyPracticeSummary {
  const { corpus, errorBank, stuckPoints, vocabCards } = params;
  const today = params.today ?? new Date();
  const todayKey = toDayKey(today);
  const nowIso = today.toISOString();

  const learningActivities = buildLearningActivities(corpus, errorBank, stuckPoints, vocabCards);
  const resumeActivity = learningActivities[0] ?? null;
  const todayActivityCount = learningActivities.filter((activity) => activity.dayKey === todayKey).length;

  const labActivityCount = countTodayLabActivity(corpus, errorBank, stuckPoints, todayKey);
  const fieldActivityCount = countTodayFieldActivity(corpus, stuckPoints, todayKey);

  const dueVocabCards = vocabCards
    .filter((card) => isVocabCardDue(card.nextDueAt))
    .sort((a, b) => String(a.nextDueAt || '').localeCompare(String(b.nextDueAt || '')));
  const todayVocabReviews = vocabCards.filter(
    (card) => card.lastViewedAt && toDayKey(card.lastViewedAt) === todayKey,
  ).length;
  const dueVocabPending = dueVocabCards.filter(
    (card) => !card.lastViewedAt || toDayKey(card.lastViewedAt) !== todayKey,
  );
  const vocabTargetCount = Math.min(3, dueVocabPending.length + todayVocabReviews);
  const vocabTaskCompleted =
    dueVocabPending.length === 0 || (vocabTargetCount > 0 && todayVocabReviews >= vocabTargetCount);

  const dueErrors = errorBank
    .filter((entry) => !entry.resolved && !!entry.nextReviewAt && entry.nextReviewAt <= nowIso)
    .sort((a, b) => String(a.nextReviewAt || '').localeCompare(String(b.nextReviewAt || '')));
  const reviewedErrorsToday = errorBank.filter(
    (entry) => entry.lastReviewAttemptAt && toDayKey(entry.lastReviewAttemptAt) === todayKey,
  ).length;
  const dueErrorsPending = dueErrors.filter(
    (entry) => !entry.lastReviewAttemptAt || toDayKey(entry.lastReviewAttemptAt) !== todayKey,
  );
  const errorTaskCompleted = dueErrorsPending.length === 0 || reviewedErrorsToday > 0;

  const tasks: DailyPracticeTask[] = [
    {
      id: 'lab',
      title: '实验室热身一句',
      description: '先用 1 条搭配造句，把表达状态拉起来。',
      sceneLabel: '句子骨架',
      path: '/lab',
      status: labActivityCount > 0 ? 'done' : 'pending',
      completedUnits: labActivityCount > 0 ? 1 : 0,
      totalUnits: 1,
      targetLabel: '1 句',
      progressLabel: labActivityCount > 0 ? '今天已热身' : '今天还没开口',
      previewItems: [],
    },
    {
      id: 'field',
      title: '实战仓答 1 题',
      description: '完成 1 道雅思口语题，把句子拉长成连续表达。',
      sceneLabel: 'Part 1 / 2 / 3',
      path: '/field',
      status: fieldActivityCount > 0 ? 'done' : 'pending',
      completedUnits: fieldActivityCount > 0 ? 1 : 0,
      totalUnits: 1,
      targetLabel: '1 题',
      progressLabel: fieldActivityCount > 0 ? '今天已开口' : '还没做雅思题',
      previewItems: [],
    },
    {
      id: 'vocab',
      title: '复习今日词卡',
      description: '先清掉最该回看的 3 张词卡，避免认识但说不出。',
      sceneLabel: '表达选词',
      path: dueVocabCards[0] ? `/vocab/${dueVocabCards[0].id}` : '/vocab-review',
      status: vocabTaskCompleted ? 'done' : 'pending',
      completedUnits: vocabTaskCompleted ? vocabTargetCount : Math.min(todayVocabReviews, vocabTargetCount),
      totalUnits: vocabTargetCount,
      targetLabel: vocabTargetCount > 0 ? `${vocabTargetCount} 张` : '已清空',
      progressLabel:
        dueVocabPending.length > 0
          ? `还剩 ${dueVocabPending.length} 张待复习`
          : '今日词卡已清空',
      previewItems: dueVocabCards.slice(0, 3).map((card) => card.headword),
    },
    {
      id: 'error',
      title: '回看 1 条错题',
      description: '至少处理 1 条该回看的错题，把旧错误变成可复用表达。',
      sceneLabel: '错题回收',
      path: dueErrors[0] ? `/errors?highlight=${encodeURIComponent(dueErrors[0].id)}` : '/errors',
      status: errorTaskCompleted ? 'done' : 'pending',
      completedUnits: errorTaskCompleted ? 1 : 0,
      totalUnits: dueErrorsPending.length > 0 || reviewedErrorsToday > 0 ? 1 : 0,
      targetLabel: dueErrorsPending.length > 0 ? '1 条' : '已清空',
      progressLabel:
        dueErrorsPending.length > 0
          ? `还有 ${dueErrorsPending.length} 条该回看`
          : '今日错题已清空',
      previewItems: dueErrors.slice(0, 2).map((entry) => entry.collocation),
    },
  ];

  const completedCount = tasks.filter((task) => task.status === 'done').length;
  const remainingCount = tasks.length - completedCount;
  const focusTask = tasks.find((task) => task.status === 'pending') ?? null;

  return {
    learningActivities,
    tasks,
    completedCount,
    remainingCount,
    focusTask,
    resumeActivity,
    todayActivityCount,
  };
}
