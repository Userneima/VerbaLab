import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { newCorpusEntryId } from '../../utils/ids';
import { corpusSentenceDedupeKey } from '../../utils/corpusDedupe';
import type { CorpusEntry } from '../types';

export function useCorpusDomain(
  setCorpus: Dispatch<SetStateAction<CorpusEntry[]>>,
  corpusDedupeIndexRef: MutableRefObject<Map<string, string>>,
) {
  const addToCorpus = useCallback(
    (entry: Omit<CorpusEntry, 'id' | 'timestamp'>) => {
      const now = new Date().toISOString();
      const incomingKey = corpusSentenceDedupeKey(entry.collocationId, entry.userSentence);

      let resultEntry: CorpusEntry;

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
          };
          const rest = prev.filter((_, i) => i !== dupIdx);
          return [resultEntry, ...rest];
        }

        resultEntry = {
          ...entry,
          id: newCorpusEntryId(),
          timestamp: now,
        };
        return [resultEntry, ...prev];
      });

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
  };
}
