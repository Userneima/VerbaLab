import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FoundryExampleOverridePack } from '../utils/syncMerge';
import { corpusSentenceDedupeKey } from '../utils/corpusDedupe';
import { normalizeErrorSentenceForDedupe } from '../utils/errorBankDedupe';
import { isBlankVocabCard } from '../utils/vocabCardBlank';
import { useCloudSync } from './useCloudSync';
import {
  loadCorpus,
  loadErrorBank,
  loadFoundryExampleOverrides,
  loadLearnedCollocations,
  loadStuckPoints,
  loadVocabCards,
  saveToStorage,
} from './persistence';
import {
  normalizeFoundryExampleOverrides,
  normalizeVocabCard,
  type CorpusEntry,
  type ErrorBankEntry,
  type StuckPointEntry,
  type VocabCard,
} from './types';
import { useCorpusDomain } from './domains/corpusDomain';
import { useErrorBankDomain } from './domains/errorBankDomain';
import { useFoundryDomain } from './domains/foundryDomain';
import { useStuckPointsDomain } from './domains/stuckPointsDomain';
import { useVocabCardsDomain } from './domains/vocabCardsDomain';

export type {
  CorpusEntry,
  ErrorBankEntry,
  ErrorCategory,
  StuckPointEntry,
  VocabCard,
  VocabCardItem,
  VocabCardRegisterAlternative,
  VocabCardRegisterGuide,
} from './types';
export {
  normalizeFoundryExampleOverrides,
  normalizeRegisterGuide,
  normalizeVocabCard,
  normalizeVocabCardItem,
} from './types';

export function useAppStore(accessToken: string | null) {
  const [corpus, setCorpus] = useState<CorpusEntry[]>(() => loadCorpus());
  const [errorBank, setErrorBank] = useState<ErrorBankEntry[]>(() => loadErrorBank());
  const [stuckPoints, setStuckPoints] = useState<StuckPointEntry[]>(() => loadStuckPoints());
  const [learnedCollocations, setLearnedCollocations] = useState<Set<string>>(() =>
    loadLearnedCollocations(),
  );
  const [vocabCards, setVocabCards] = useState<VocabCard[]>(() => loadVocabCards());
  const [foundryExampleOverrides, setFoundryExampleOverrides] = useState<
    Record<string, FoundryExampleOverridePack>
  >(() => loadFoundryExampleOverrides());

  const corpusDedupeIndexRef = useRef<Map<string, string>>(new Map());
  const errorDedupeIndexRef = useRef<Map<string, string>>(new Map());
  const legacyCorpusZhMigrated = useRef(false);

  useEffect(() => {
    if (legacyCorpusZhMigrated.current) return;
    try {
      const raw = localStorage.getItem('ff_corpus_zh_cache');
      if (!raw) {
        legacyCorpusZhMigrated.current = true;
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, { translation?: string; sentence?: string }>;
      if (!parsed || typeof parsed !== 'object') {
        legacyCorpusZhMigrated.current = true;
        return;
      }
      setCorpus((prev) => {
        let changed = false;
        const next = prev.map((entry) => {
          const row = parsed[entry.id];
          const translation = row?.translation?.trim();
          if (translation && row?.sentence === entry.userSentence && !entry.zhTranslation) {
            changed = true;
            return { ...entry, zhTranslation: translation, timestamp: new Date().toISOString() };
          }
          return entry;
        });
        return changed ? next : prev;
      });
      localStorage.removeItem('ff_corpus_zh_cache');
    } catch {
      // ignore legacy cache failures
    }
    legacyCorpusZhMigrated.current = true;
  }, []);

  useEffect(() => {
    saveToStorage('ff_corpus', corpus);
  }, [corpus]);
  useEffect(() => {
    saveToStorage('ff_errors', errorBank);
  }, [errorBank]);
  useEffect(() => {
    saveToStorage('ff_stuck', stuckPoints);
  }, [stuckPoints]);
  useEffect(() => {
    saveToStorage('ff_learned', learnedCollocations);
  }, [learnedCollocations]);
  useEffect(() => {
    saveToStorage('ff_vocab_cards', vocabCards);
  }, [vocabCards]);
  useEffect(() => {
    saveToStorage('ff_foundry_examples', foundryExampleOverrides);
  }, [foundryExampleOverrides]);

  useEffect(() => {
    setVocabCards((prev) => {
      const next = prev.filter((card) => !isBlankVocabCard(card));
      return next.length === prev.length ? prev : next;
    });
  }, []);

  useEffect(() => {
    const next = new Map<string, string>();
    for (const entry of corpus) {
      next.set(corpusSentenceDedupeKey(entry.collocationId, entry.userSentence), entry.id);
    }
    corpusDedupeIndexRef.current = next;
  }, [corpus]);

  useEffect(() => {
    const next = new Map<string, string>();
    for (const entry of errorBank) {
      if (entry.resolved) continue;
      next.set(
        `${entry.collocationId}\0${normalizeErrorSentenceForDedupe(entry.originalSentence)}`,
        entry.id,
      );
    }
    errorDedupeIndexRef.current = next;
  }, [errorBank]);

  const foundryDomain = useFoundryDomain(setFoundryExampleOverrides);
  const corpusDomain = useCorpusDomain(setCorpus, corpusDedupeIndexRef);
  const errorBankDomain = useErrorBankDomain(setErrorBank, errorDedupeIndexRef);
  const stuckPointsDomain = useStuckPointsDomain(setStuckPoints);
  const vocabCardsDomain = useVocabCardsDomain(vocabCards, setVocabCards);

  const markAsLearned = useCallback((colId: string) => {
    setLearnedCollocations((prev) => {
      const next = new Set(prev);
      next.add(colId);
      return next;
    });
  }, []);

  const unmarkAsLearned = useCallback((colId: string) => {
    setLearnedCollocations((prev) => {
      const next = new Set(prev);
      next.delete(colId);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setCorpus([]);
    setErrorBank([]);
    setStuckPoints([]);
    setLearnedCollocations(new Set());
    setVocabCards([]);
    setFoundryExampleOverrides({});
  }, []);

  const {
    syncStatus,
    lastSyncTime,
    syncError,
    pushToCloud,
    pullFromCloud,
    autoSyncEnabled,
    setAutoSyncEnabled,
  } = useCloudSync({
    accessToken,
    corpus,
    setCorpus,
    errorBank,
    setErrorBank,
    stuckPoints,
    setStuckPoints,
    learnedCollocations,
    setLearnedCollocations,
    vocabCards,
    setVocabCards,
    foundryExampleOverrides,
    setFoundryExampleOverrides,
    normalizeVocabCard,
    normalizeFoundryExampleOverrides,
  });

  const stats = useMemo(
    () => ({
      totalLearned: learnedCollocations.size,
      corpusSize: corpus.length,
      errorCount: errorBank.filter((entry) => !entry.resolved).length,
      stuckCount: stuckPoints.length,
      vocabCardCount: vocabCards.length,
      vocabDueCount: vocabCardsDomain.vocabDueCount,
    }),
    [corpus.length, errorBank, learnedCollocations.size, stuckPoints.length, vocabCards.length, vocabCardsDomain.vocabDueCount],
  );

  return {
    corpus,
    errorBank,
    stuckPoints,
    learnedCollocations,
    vocabCards,
    foundryExampleOverrides,
    ...foundryDomain,
    markAsLearned,
    unmarkAsLearned,
    ...corpusDomain,
    ...errorBankDomain,
    ...stuckPointsDomain,
    ...vocabCardsDomain,
    clearAll,
    syncStatus,
    lastSyncTime,
    syncError,
    pushToCloud,
    pullFromCloud,
    autoSyncEnabled,
    setAutoSyncEnabled,
    isLoggedIn: !!accessToken,
    stats,
  };
}

export type AppStore = ReturnType<typeof useAppStore>;
