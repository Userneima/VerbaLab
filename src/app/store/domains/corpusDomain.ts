import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { newCorpusEntryId } from '../../utils/ids';
import { corpusSentenceDedupeKey } from '../../utils/corpusDedupe';
import { trackProductEvent } from '../../utils/api';
import {
  computeCorpusAfterRemembered,
  computeCorpusAfterStruggled,
  computeCorpusAfterViewed,
  initialCorpusNextReviewAt,
  isCorpusEntryDue,
} from '../../utils/corpusReview';
import type { SentenceTileDifficulty } from '../../utils/sentenceTileBank';
import type { CorpusEntry } from '../types';

type AddCorpusEntryInput = Omit<
  CorpusEntry,
  | 'id'
  | 'createdAt'
  | 'timestamp'
  | 'lastReviewedAt'
  | 'nextReviewAt'
  | 'reviewStage'
  | 'sentenceReviewDifficulty'
  | 'reviewRememberedStreak'
>;

export function useCorpusDomain(
  setCorpus: Dispatch<SetStateAction<CorpusEntry[]>>,
  corpusDedupeIndexRef: MutableRefObject<Map<string, string>>,
) {
  const addToCorpus = useCallback(
    (entry: AddCorpusEntryInput) => {
      const now = new Date().toISOString();
      const incomingKey = corpusSentenceDedupeKey(entry.collocationId, entry.userSentence);

      let resultEntry: CorpusEntry | undefined;

      setCorpus((prev) => {
        const dupId = corpusDedupeIndexRef.current.get(incomingKey);
        const dupIdx = dupId
          ? prev.findIndex((e) => e.id === dupId)
          : prev.findIndex(
              (e) => corpusSentenceDedupeKey(e.collocationId, e.userSentence) === incomingKey,
            );

        if (dupIdx !== -1) {
          const existing = prev[dupIdx];
          const mergedTags = Array.from(
            new Set([...existing.tags, ...entry.tags].map((t) => t.trim()).filter(Boolean)),
          );
          const newSentence = entry.userSentence.trim() || existing.userSentence;
          const sentenceChanged = newSentence !== existing.userSentence;
          resultEntry = {
            ...existing,
            timestamp: now,
            userSentence: newSentence,
            verbId: entry.verbId,
            verb: entry.verb,
            collocation: entry.collocation,
            isCorrect: entry.isCorrect && existing.isCorrect,
            mode: entry.mode,
            tags: mergedTags.length ? mergedTags : existing.tags,
            nativeVersion: entry.nativeVersion ?? existing.nativeVersion,
            nativeThinking: entry.nativeThinking ?? existing.nativeThinking,
            isChinglish: entry.isChinglish ?? existing.isChinglish,
            zhTranslation: sentenceChanged ? undefined : existing.zhTranslation,
            lastReviewedAt: sentenceChanged ? null : existing.lastReviewedAt,
            nextReviewAt: sentenceChanged
              ? initialCorpusNextReviewAt()
              : existing.nextReviewAt,
            reviewStage: sentenceChanged ? 0 : existing.reviewStage,
            sentenceReviewDifficulty: sentenceChanged ? 'phrase' : existing.sentenceReviewDifficulty,
            reviewRememberedStreak: sentenceChanged ? 0 : existing.reviewRememberedStreak,
          };
          const rest = prev.filter((_, i) => i !== dupIdx);
          return [resultEntry, ...rest];
        }

        resultEntry = {
          ...entry,
          id: newCorpusEntryId(),
          createdAt: now,
          timestamp: now,
          lastReviewedAt: null,
          nextReviewAt: initialCorpusNextReviewAt(),
          reviewStage: 0,
          sentenceReviewDifficulty: 'phrase',
          reviewRememberedStreak: 0,
        };
        return [resultEntry, ...prev];
      });

      if (resultEntry) {
        trackProductEvent({
          eventName: 'corpus_entry_created',
          surface: resultEntry.mode,
          objectType: 'corpus',
          objectId: resultEntry.id,
          metadata: {
            mode: resultEntry.mode,
            collocationId: resultEntry.collocationId,
            isCorrect: resultEntry.isCorrect,
          },
        });
      }

      return resultEntry!;
    },
    [corpusDedupeIndexRef, setCorpus],
  );

  const removeCorpusEntry = useCallback(
    (entryId: string) => {
      setCorpus((prev) => prev.filter((entry) => entry.id !== entryId));
    },
    [setCorpus],
  );

  const setCorpusEntryZhTranslation = useCallback(
    (entryId: string, translation: string) => {
      const trimmed = translation.trim();
      const now = new Date().toISOString();
      setCorpus((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? { ...entry, zhTranslation: trimmed || undefined, timestamp: now }
            : entry,
        ),
      );
    },
    [setCorpus],
  );

  const updateCorpusEntrySentence = useCallback(
    (entryId: string, sentence: string) => {
      const trimmed = sentence.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      setCorpus((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                userSentence: trimmed,
                zhTranslation:
                  trimmed === entry.userSentence.trim() ? entry.zhTranslation : undefined,
                timestamp: now,
                lastReviewedAt:
                  trimmed === entry.userSentence.trim() ? entry.lastReviewedAt : null,
                nextReviewAt:
                  trimmed === entry.userSentence.trim()
                    ? entry.nextReviewAt
                    : initialCorpusNextReviewAt(),
                reviewStage:
                  trimmed === entry.userSentence.trim() ? entry.reviewStage : 0,
                sentenceReviewDifficulty:
                  trimmed === entry.userSentence.trim() ? entry.sentenceReviewDifficulty : 'phrase',
                reviewRememberedStreak:
                  trimmed === entry.userSentence.trim() ? entry.reviewRememberedStreak : 0,
              }
            : entry,
        ),
      );
    },
    [setCorpus],
  );

  const markCorpusEntryViewed = useCallback(
    (entryId: string) => {
      const now = new Date().toISOString();
      setCorpus((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry;
          if (!isCorpusEntryDue(entry.nextReviewAt)) {
            return {
              ...entry,
              reviewRememberedStreak: 0,
            };
          }
          const { nextReviewAt } = computeCorpusAfterViewed(entry.reviewStage);
          return {
            ...entry,
            lastReviewedAt: now,
            nextReviewAt,
            reviewRememberedStreak: 0,
          };
        }),
      );
      trackProductEvent({
        eventName: 'corpus_entry_reviewed',
        surface: 'corpus',
        objectType: 'corpus',
        objectId: entryId,
        metadata: { result: 'viewed' },
      });
    },
    [setCorpus],
  );

  const markCorpusEntryRemembered = useCallback(
    (entryId: string) => {
      const now = new Date().toISOString();
      setCorpus((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry;
          const { reviewStage, nextReviewAt } = computeCorpusAfterRemembered(entry.reviewStage);
          return {
            ...entry,
            lastReviewedAt: now,
            reviewStage,
            nextReviewAt,
            reviewRememberedStreak: entry.reviewRememberedStreak + 1,
          };
        }),
      );
      trackProductEvent({
        eventName: 'corpus_entry_reviewed',
        surface: 'corpus',
        objectType: 'corpus',
        objectId: entryId,
        metadata: { result: 'remembered' },
      });
    },
    [setCorpus],
  );

  const markCorpusEntryStruggled = useCallback(
    (entryId: string) => {
      const now = new Date().toISOString();
      setCorpus((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry;
          const { reviewStage, nextReviewAt } = computeCorpusAfterStruggled();
          return {
            ...entry,
            lastReviewedAt: now,
            reviewStage,
            nextReviewAt,
            reviewRememberedStreak: 0,
          };
        }),
      );
      trackProductEvent({
        eventName: 'corpus_entry_reviewed',
        surface: 'corpus',
        objectType: 'corpus',
        objectId: entryId,
        metadata: { result: 'struggled' },
      });
    },
    [setCorpus],
  );

  const setCorpusEntryReviewDifficulty = useCallback(
    (entryId: string, difficulty: SentenceTileDifficulty) => {
      setCorpus((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                sentenceReviewDifficulty: difficulty,
                reviewRememberedStreak: 0,
              }
            : entry,
        ),
      );
    },
    [setCorpus],
  );

  return {
    addToCorpus,
    removeCorpusEntry,
    setCorpusEntryZhTranslation,
    updateCorpusEntrySentence,
    markCorpusEntryViewed,
    markCorpusEntryRemembered,
    markCorpusEntryStruggled,
    setCorpusEntryReviewDifficulty,
  };
}
