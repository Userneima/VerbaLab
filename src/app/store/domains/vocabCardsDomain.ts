import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { newVocabCardId } from '../../utils/ids';
import {
  computeAfterRemembered,
  computeAfterStruggled,
  computeNextDueAfterView,
  initialNextDueAt,
  isVocabCardDue,
} from '../../utils/vocabCardReview';
import type {
  VocabCard,
  VocabCardItem,
  VocabCardRegisterGuide,
} from '../types';

type AddVocabCardInput = {
  headword: string;
  sense?: string;
  tags: string[];
  items: VocabCardItem[];
  spokenPracticePhrase?: string;
  writtenSupplement?: string;
  registerNoteZh?: string;
  registerGuide?: VocabCardRegisterGuide;
  spokenAlternatives?: string[];
  isCommonInSpokenEnglish?: boolean;
};

export function useVocabCardsDomain(
  vocabCards: VocabCard[],
  setVocabCards: Dispatch<SetStateAction<VocabCard[]>>,
) {
  const addVocabCard = useCallback(
    (input: AddVocabCardInput) => {
      const id = newVocabCardId();
      const now = new Date().toISOString();
      const items = input.items.map((item, index) => ({
        ...item,
        id: item.id || `${id}-i${index}`,
      }));
      const newCard: VocabCard = {
        id,
        timestamp: now,
        headword: input.headword.trim(),
        sense: input.sense?.trim() || undefined,
        spokenPracticePhrase: input.spokenPracticePhrase?.trim() || undefined,
        writtenSupplement: input.writtenSupplement?.trim() || undefined,
        registerNoteZh: input.registerNoteZh?.trim() || undefined,
        registerGuide: input.registerGuide,
        spokenAlternatives: input.spokenAlternatives?.length
          ? [...new Set(input.spokenAlternatives.map((s) => s.trim()).filter(Boolean))]
          : undefined,
        isCommonInSpokenEnglish: input.isCommonInSpokenEnglish,
        tags: input.tags,
        items,
        source: 'ai_word_lab',
        lastViewedAt: null,
        nextDueAt: initialNextDueAt(),
        reviewStage: 0,
      };
      setVocabCards((prev) => [newCard, ...prev]);
      return newCard;
    },
    [setVocabCards],
  );

  const updateVocabCard = useCallback(
    (cardId: string, patch: Partial<VocabCard>) => {
      const now = new Date().toISOString();
      setVocabCards((prev) =>
        prev.map((card) => (card.id === cardId ? { ...card, ...patch, id: card.id, timestamp: now } : card)),
      );
    },
    [setVocabCards],
  );

  const deleteVocabCard = useCallback(
    (cardId: string) => {
      setVocabCards((prev) => prev.filter((card) => card.id !== cardId));
    },
    [setVocabCards],
  );

  const markVocabCardViewed = useCallback(
    (cardId: string) => {
      const now = new Date().toISOString();
      setVocabCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card;
          return {
            ...card,
            timestamp: now,
            lastViewedAt: now,
            nextDueAt: computeNextDueAfterView(card.reviewStage),
          };
        }),
      );
    },
    [setVocabCards],
  );

  const markVocabCardRemembered = useCallback(
    (cardId: string) => {
      const now = new Date().toISOString();
      setVocabCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card;
          const { reviewStage, nextDueAt } = computeAfterRemembered(card.reviewStage);
          return { ...card, timestamp: now, lastViewedAt: now, reviewStage, nextDueAt };
        }),
      );
    },
    [setVocabCards],
  );

  const markVocabCardStruggled = useCallback(
    (cardId: string) => {
      const now = new Date().toISOString();
      setVocabCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card;
          const { reviewStage, nextDueAt } = computeAfterStruggled();
          return { ...card, timestamp: now, lastViewedAt: now, reviewStage, nextDueAt };
        }),
      );
    },
    [setVocabCards],
  );

  const vocabDueCount = useMemo(
    () => vocabCards.filter((card) => isVocabCardDue(card.nextDueAt)).length,
    [vocabCards],
  );

  return {
    addVocabCard,
    updateVocabCard,
    deleteVocabCard,
    markVocabCardViewed,
    markVocabCardRemembered,
    markVocabCardStruggled,
    vocabDueCount,
  };
}
