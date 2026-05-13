import type { VocabCard } from '../store/types';
import { isVocabCardDue } from './vocabCardReview';

function normalizeHeadword(text: string): string {
  return text.trim().toLowerCase();
}

export function compareVocabCardsByHeadword(a: VocabCard, b: VocabCard): number {
  const byHeadword = normalizeHeadword(a.headword).localeCompare(normalizeHeadword(b.headword), 'en', {
    sensitivity: 'base',
  });
  if (byHeadword !== 0) return byHeadword;
  return b.timestamp.localeCompare(a.timestamp);
}

export function getDueVocabReviewQueue(cards: VocabCard[]): VocabCard[] {
  return [...cards]
    .filter((card) => isVocabCardDue(card.nextDueAt))
    .sort((a, b) => {
      if (a.nextDueAt && b.nextDueAt && a.nextDueAt !== b.nextDueAt) {
        return a.nextDueAt.localeCompare(b.nextDueAt);
      }
      return compareVocabCardsByHeadword(a, b);
    });
}

export function getNextDueVocabCardId(cards: VocabCard[], currentCardId: string): string | null {
  const queue = getDueVocabReviewQueue(cards);
  const currentIndex = queue.findIndex((card) => card.id === currentCardId);
  if (currentIndex === -1) {
    return queue[0]?.id ?? null;
  }
  return queue[currentIndex + 1]?.id ?? null;
}
