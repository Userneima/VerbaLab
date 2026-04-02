import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  computeNextDueAfterView,
  computeAfterRemembered,
  computeAfterStruggled,
  initialNextDueAt,
  isVocabCardDue,
} from './vocabCardReview';
import { VOCAB_REVIEW_INTERVAL_DAYS } from './reviewConfig';

describe('vocabCardReview', () => {
  const fixed = new Date('2025-06-01T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixed);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computeNextDueAfterView uses stage-capped interval', () => {
    const d0 = computeNextDueAfterView(0);
    expect(new Date(d0).getTime() - fixed.getTime()).toBe(VOCAB_REVIEW_INTERVAL_DAYS[0] * 86400000);
    const d2 = computeNextDueAfterView(99);
    expect(new Date(d2).getTime() - fixed.getTime()).toBe(VOCAB_REVIEW_INTERVAL_DAYS[2] * 86400000);
  });

  it('computeAfterRemembered advances stage and sets next due', () => {
    const { reviewStage, nextDueAt } = computeAfterRemembered(0);
    expect(reviewStage).toBe(1);
    expect(nextDueAt > fixed.toISOString()).toBe(true);
  });

  it('computeAfterStruggled resets to stage 0 and ~24h', () => {
    const { reviewStage, nextDueAt } = computeAfterStruggled();
    expect(reviewStage).toBe(0);
    const delta = new Date(nextDueAt).getTime() - fixed.getTime();
    expect(delta).toBe(86400000);
  });

  it('initialNextDueAt matches stage 0 interval', () => {
    expect(initialNextDueAt()).toBe(computeNextDueAfterView(0));
  });

  it('isVocabCardDue compares to now', () => {
    expect(isVocabCardDue(null)).toBe(false);
    expect(isVocabCardDue('2000-01-01T00:00:00.000Z')).toBe(true);
    expect(isVocabCardDue('2099-01-01T00:00:00.000Z')).toBe(false);
  });
});
