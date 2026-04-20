import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { newErrorBankEntryId } from '../../utils/ids';
import { normalizeErrorSentenceForDedupe } from '../../utils/errorBankDedupe';
import { clearErrorReviewProduceDraft } from '../../utils/errorReviewDraftStorage';
import {
  ERROR_REVIEW_RESET_HOURS,
  ERROR_REVIEW_STAGE_HOURS,
  MS_PER_HOUR,
} from '../../utils/reviewConfig';
import type { ErrorBankEntry, ErrorCategory } from '../types';

type AddErrorInput = Omit<
  ErrorBankEntry,
  'id' | 'timestamp' | 'resolved' | 'nextReviewAt' | 'reviewStage'
> & {
  errorCategory?: ErrorCategory;
  nextReviewAt?: string | null;
  reviewStage?: number;
  reviewCueZh?: string;
};

export function useErrorBankDomain(
  setErrorBank: Dispatch<SetStateAction<ErrorBankEntry[]>>,
  errorDedupeIndexRef: MutableRefObject<Map<string, string>>,
) {
  const addToErrorBank = useCallback(
    (entry: AddErrorInput) => {
      const now = new Date();
      const nextReview = new Date(
        now.getTime() + ERROR_REVIEW_RESET_HOURS * MS_PER_HOUR,
      ).toISOString();
      const incomingNorm = normalizeErrorSentenceForDedupe(entry.originalSentence);
      const incomingKey = `${entry.collocationId}\0${incomingNorm}`;

      let resultEntry: ErrorBankEntry;

      setErrorBank((prev) => {
        const dupId = errorDedupeIndexRef.current.get(incomingKey);
        const dupIdx = dupId
          ? prev.findIndex((e) => e.id === dupId)
          : prev.findIndex(
              (e) =>
                !e.resolved &&
                e.collocationId === entry.collocationId &&
                normalizeErrorSentenceForDedupe(e.originalSentence) === incomingNorm,
            );

        if (dupIdx !== -1) {
          const existing = prev[dupIdx];
          const mergedErrorTypes = Array.from(
            new Set([...existing.errorTypes, ...entry.errorTypes].map((t) => t.trim()).filter(Boolean)),
          );
          const mergedGrammarPoints = Array.from(
            new Set(
              [...existing.grammarPoints, ...entry.grammarPoints].map((g) => g.trim()).filter(Boolean),
            ),
          );
          resultEntry = {
            ...existing,
            timestamp: now.toISOString(),
            originalSentence: entry.originalSentence.trim() || existing.originalSentence,
            correctedSentence: entry.correctedSentence?.trim() || existing.correctedSentence,
            errorTypes: mergedErrorTypes.length ? mergedErrorTypes : existing.errorTypes,
            errorCategory: entry.errorCategory ?? existing.errorCategory,
            diagnosis: entry.diagnosis || existing.diagnosis,
            hint: entry.hint || existing.hint,
            grammarPoints: mergedGrammarPoints.length ? mergedGrammarPoints : existing.grammarPoints,
            reviewCueZh: entry.reviewCueZh ?? existing.reviewCueZh,
            nativeVersion: entry.nativeVersion ?? existing.nativeVersion,
            nativeThinking: entry.nativeThinking ?? existing.nativeThinking,
            reviewReproClozeDone: existing.reviewReproClozeDone,
          };
          const rest = prev.filter((_, i) => i !== dupIdx);
          return [resultEntry, ...rest];
        }

        resultEntry = {
          ...entry,
          id: newErrorBankEntryId(),
          timestamp: now.toISOString(),
          resolved: false,
          errorCategory: entry.errorCategory ?? 'grammar',
          nextReviewAt: entry.nextReviewAt ?? nextReview,
          reviewStage: entry.reviewStage ?? 0,
          reviewCueZh: entry.reviewCueZh,
        };
        return [resultEntry, ...prev];
      });

      return resultEntry!;
    },
    [errorDedupeIndexRef, setErrorBank],
  );

  const recordErrorReviewAttempt = useCallback(
    (errorId: string) => {
      setErrorBank((prev) =>
        prev.map((entry) => {
          if (entry.id !== errorId) return entry;
          return {
            ...entry,
            reviewAttemptCount: (entry.reviewAttemptCount ?? 0) + 1,
            lastReviewAttemptAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setErrorBank],
  );

  const resolveError = useCallback(
    (errorId: string) => {
      clearErrorReviewProduceDraft(errorId);
      setErrorBank((prev) =>
        prev.map((entry) =>
          entry.id === errorId ? { ...entry, resolved: true, reviewReproClozeDone: false } : entry,
        ),
      );
    },
    [setErrorBank],
  );

  const removeErrorBankEntry = useCallback(
    (errorId: string) => {
      clearErrorReviewProduceDraft(errorId);
      setErrorBank((prev) => prev.filter((entry) => entry.id !== errorId));
    },
    [setErrorBank],
  );

  const setErrorBankCorrectedSentence = useCallback(
    (errorId: string, correctedSentence: string) => {
      const trimmed = correctedSentence.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      setErrorBank((prev) =>
        prev.map((entry) =>
          entry.id === errorId
            ? {
                ...entry,
                correctedSentence: trimmed,
                timestamp: now,
              }
            : entry,
        ),
      );
    },
    [setErrorBank],
  );

  const setErrorReviewReproClozeDone = useCallback(
    (errorId: string, done: boolean) => {
      setErrorBank((prev) =>
        prev.map((entry) => (entry.id === errorId ? { ...entry, reviewReproClozeDone: done } : entry)),
      );
    },
    [setErrorBank],
  );

  const scheduleNextReview = useCallback(
    (errorId: string) => {
      clearErrorReviewProduceDraft(errorId);
      setErrorBank((prev) =>
        prev.map((entry) => {
          if (entry.id !== errorId || entry.resolved) return entry;
          const stage = entry.reviewStage ?? 0;
          const nextStage = Math.min(stage + 1, 2);
          const hours = ERROR_REVIEW_STAGE_HOURS[nextStage] ?? ERROR_REVIEW_STAGE_HOURS[0];
          return {
            ...entry,
            reviewStage: nextStage,
            nextReviewAt: new Date(Date.now() + hours * MS_PER_HOUR).toISOString(),
            reviewReproClozeDone: false,
          };
        }),
      );
    },
    [setErrorBank],
  );

  const resetReview = useCallback(
    (errorId: string) => {
      setErrorBank((prev) =>
        prev.map((entry) => {
          if (entry.id !== errorId) return entry;
          return {
            ...entry,
            reviewStage: 0,
            nextReviewAt: new Date(Date.now() + ERROR_REVIEW_RESET_HOURS * MS_PER_HOUR).toISOString(),
          };
        }),
      );
    },
    [setErrorBank],
  );

  return {
    addToErrorBank,
    recordErrorReviewAttempt,
    resolveError,
    removeErrorBankEntry,
    setErrorBankCorrectedSentence,
    setErrorReviewReproClozeDone,
    scheduleNextReview,
    resetReview,
  };
}
