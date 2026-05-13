import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VocabCard } from '../store/types';
import { compareVocabCardsByHeadword, getDueVocabReviewQueue, getNextDueVocabCardId } from './vocabReviewQueue';

function createCard(overrides: Partial<VocabCard> & Pick<VocabCard, 'id' | 'headword'>): VocabCard {
  return {
    id: overrides.id,
    timestamp: overrides.timestamp ?? '2026-05-13T10:00:00.000Z',
    headword: overrides.headword,
    sense: overrides.sense,
    spokenPracticePhrase: overrides.spokenPracticePhrase,
    writtenSupplement: overrides.writtenSupplement,
    registerNoteZh: overrides.registerNoteZh,
    registerGuide: overrides.registerGuide,
    spokenAlternatives: overrides.spokenAlternatives,
    isCommonInSpokenEnglish: overrides.isCommonInSpokenEnglish,
    tags: overrides.tags ?? [],
    items: overrides.items ?? [],
    source: 'ai_word_lab',
    lastViewedAt: overrides.lastViewedAt ?? null,
    nextDueAt: overrides.nextDueAt ?? null,
    reviewStage: overrides.reviewStage ?? 0,
  };
}

describe('vocabReviewQueue', () => {
  const fixed = new Date('2026-05-13T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixed);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sorts due cards by nextDueAt, then headword', () => {
    const cards = [
      createCard({ id: 'c', headword: 'zebra', nextDueAt: '2026-05-13T09:00:00.000Z' }),
      createCard({ id: 'a', headword: 'apple', nextDueAt: '2026-05-13T08:00:00.000Z' }),
      createCard({ id: 'b', headword: 'banana', nextDueAt: '2099-05-13T08:00:00.000Z' }),
      createCard({ id: 'd', headword: 'alpha', nextDueAt: '2026-05-13T09:00:00.000Z' }),
    ];

    expect(getDueVocabReviewQueue(cards).map((card) => card.id)).toEqual(['a', 'd', 'c']);
  });

  it('compares headwords case-insensitively and falls back to timestamp', () => {
    const first = createCard({ id: '1', headword: 'Apple', timestamp: '2026-05-13T10:00:00.000Z' });
    const second = createCard({ id: '2', headword: 'apple', timestamp: '2026-05-13T11:00:00.000Z' });

    expect(compareVocabCardsByHeadword(first, second)).toBeGreaterThan(0);
  });

  it('returns the next due card id in the current queue', () => {
    const cards = [
      createCard({ id: '1', headword: 'apple', nextDueAt: '2026-05-13T08:00:00.000Z' }),
      createCard({ id: '2', headword: 'banana', nextDueAt: '2026-05-13T09:00:00.000Z' }),
      createCard({ id: '3', headword: 'cocoa', nextDueAt: '2099-05-13T09:00:00.000Z' }),
    ];

    expect(getNextDueVocabCardId(cards, '1')).toBe('2');
    expect(getNextDueVocabCardId(cards, '2')).toBeNull();
  });

  it('falls back to the first due card when current id is missing', () => {
    const cards = [
      createCard({ id: '1', headword: 'apple', nextDueAt: '2026-05-13T08:00:00.000Z' }),
      createCard({ id: '2', headword: 'banana', nextDueAt: '2026-05-13T09:00:00.000Z' }),
    ];

    expect(getNextDueVocabCardId(cards, 'missing')).toBe('1');
  });
});
