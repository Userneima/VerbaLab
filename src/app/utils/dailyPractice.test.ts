import { describe, expect, it } from 'vitest';
import { buildDailyPracticeSummary, toDayKey } from './dailyPractice';
import type { CorpusEntry, ErrorBankEntry, StuckPointEntry, VocabCard } from '../store/types';

const fixedToday = new Date('2026-04-22T09:00:00.000Z');

function makeCorpus(overrides: Partial<CorpusEntry>): CorpusEntry {
  return {
    id: 'corpus-1',
    timestamp: fixedToday.toISOString(),
    verbId: 'v1',
    verb: 'make',
    collocationId: 'c1',
    collocation: 'make progress',
    userSentence: 'I made progress today.',
    isCorrect: true,
    mode: 'test',
    tags: [],
    ...overrides,
  };
}

function makeError(overrides: Partial<ErrorBankEntry>): ErrorBankEntry {
  return {
    id: 'error-1',
    timestamp: '2026-04-21T09:00:00.000Z',
    verbId: 'v1',
    verb: 'make',
    collocationId: 'c1',
    collocation: 'make progress',
    originalSentence: 'I make a progress.',
    correctedSentence: 'I made progress.',
    errorTypes: ['article'],
    errorCategory: 'grammar',
    diagnosis: 'article misuse',
    hint: 'drop the article',
    grammarPoints: ['uncountable nouns'],
    resolved: false,
    nextReviewAt: '2026-04-22T08:00:00.000Z',
    reviewStage: 0,
    ...overrides,
  };
}

function makeStuck(overrides: Partial<StuckPointEntry>): StuckPointEntry {
  return {
    id: 'stuck-1',
    timestamp: fixedToday.toISOString(),
    chineseThought: '我想继续说下去',
    englishAttempt: '',
    aiSuggestion: 'Keep going.',
    resolved: false,
    sourceMode: 'field',
    ...overrides,
  };
}

function makeVocab(overrides: Partial<VocabCard>): VocabCard {
  return {
    id: 'vc-1',
    timestamp: '2026-04-21T08:00:00.000Z',
    headword: 'abode',
    tags: ['#n.'],
    items: [
      {
        id: 'vc-1-i1',
        questionId: 'Q1',
        part: 2,
        topic: 'Home',
        questionSnapshot: 'Describe a place you want to live in.',
        sentence: 'The house had a quiet atmosphere.',
        collocationsUsed: ['quiet atmosphere'],
      },
    ],
    source: 'ai_word_lab',
    lastViewedAt: null,
    nextDueAt: '2026-04-20T00:00:00.000Z',
    reviewStage: 0,
    ...overrides,
  };
}

describe('dailyPractice', () => {
  it('builds a four-step task flow with due review items', () => {
    const summary = buildDailyPracticeSummary({
      corpus: [],
      errorBank: [makeError({ id: 'error-a', collocation: 'take a break' })],
      stuckPoints: [],
      vocabCards: [
        makeVocab({ id: 'vc-a', headword: 'abode' }),
        makeVocab({ id: 'vc-b', headword: 'intersection' }),
      ],
      today: fixedToday,
    });

    expect(summary.tasks.map((task) => task.id)).toEqual(['lab', 'field', 'vocab', 'error']);
    expect(summary.focusTask?.id).toBe('lab');
    expect(summary.tasks.find((task) => task.id === 'vocab')?.previewItems).toEqual([
      'abode',
      'intersection',
    ]);
    expect(summary.tasks.find((task) => task.id === 'error')?.path).toContain('/errors?highlight=');
  });

  it('marks lab and field tasks done when today already has matching activity', () => {
    const summary = buildDailyPracticeSummary({
      corpus: [
        makeCorpus({ id: 'corpus-lab', mode: 'test', timestamp: fixedToday.toISOString() }),
        makeCorpus({ id: 'corpus-field', mode: 'field', timestamp: fixedToday.toISOString() }),
      ],
      errorBank: [],
      stuckPoints: [makeStuck({ id: 'stuck-field', timestamp: fixedToday.toISOString(), sourceMode: 'field' })],
      vocabCards: [],
      today: fixedToday,
    });

    expect(summary.tasks.find((task) => task.id === 'lab')?.status).toBe('done');
    expect(summary.tasks.find((task) => task.id === 'field')?.status).toBe('done');
    expect(summary.completedCount).toBe(4);
    expect(summary.remainingCount).toBe(0);
  });

  it('treats reviewed vocab and error attempts today as completed review work', () => {
    const summary = buildDailyPracticeSummary({
      corpus: [],
      errorBank: [
        makeError({
          id: 'error-a',
          collocation: 'take a break',
          lastReviewAttemptAt: fixedToday.toISOString(),
        }),
      ],
      stuckPoints: [],
      vocabCards: [
        makeVocab({
          id: 'vc-a',
          headword: 'abode',
          lastViewedAt: fixedToday.toISOString(),
        }),
      ],
      today: fixedToday,
    });

    expect(summary.tasks.find((task) => task.id === 'vocab')?.status).toBe('done');
    expect(summary.tasks.find((task) => task.id === 'error')?.status).toBe('done');
  });

  it('builds learning activity scenes for calendar and resume', () => {
    const summary = buildDailyPracticeSummary({
      corpus: [makeCorpus({ mode: 'field', timestamp: fixedToday.toISOString() })],
      errorBank: [],
      stuckPoints: [],
      vocabCards: [makeVocab({ timestamp: '2026-04-20T00:00:00.000Z' })],
      today: fixedToday,
    });

    expect(summary.resumeActivity?.sceneLabel).toBe('雅思表达');
    expect(summary.learningActivities[0].dayKey).toBe(toDayKey(fixedToday));
    expect(summary.todayActivityCount).toBe(1);
  });
});
