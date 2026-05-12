import {
  computeAfterRemembered,
  computeAfterStruggled,
  computeNextDueAfterView,
  isVocabCardDue,
} from './vocabCardReview';

export function initialCorpusNextReviewAt(seedTimestamp?: string): string {
  if (seedTimestamp) return seedTimestamp;
  return computeNextDueAfterView(0);
}

export function computeCorpusAfterViewed(stage: number): { nextReviewAt: string } {
  return {
    nextReviewAt: computeNextDueAfterView(stage),
  };
}

export function computeCorpusAfterRemembered(stage: number): {
  reviewStage: number;
  nextReviewAt: string;
} {
  const { reviewStage, nextDueAt } = computeAfterRemembered(stage);
  return { reviewStage, nextReviewAt: nextDueAt };
}

export function computeCorpusAfterStruggled(): {
  reviewStage: number;
  nextReviewAt: string;
} {
  const { reviewStage, nextDueAt } = computeAfterStruggled();
  return { reviewStage, nextReviewAt: nextDueAt };
}

export function isCorpusEntryDue(nextReviewAt: string | null): boolean {
  return isVocabCardDue(nextReviewAt);
}
