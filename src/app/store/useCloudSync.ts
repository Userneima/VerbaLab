import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { syncLoad, syncSave } from '../utils/api';
import {
  mergeByIdNewerTimestamp,
  mergeVocabCards,
  mergeFoundryExampleOverrides,
  mergeLearnedCollocationIds,
  type FoundryExampleOverridePack,
} from '../utils/syncMerge';
import type {
  CorpusEntry,
  ErrorBankEntry,
  StuckPointEntry,
  VocabCard,
} from './types';

type SyncStatus = 'idle' | 'saving' | 'loading' | 'success' | 'error';

type UseCloudSyncArgs = {
  accessToken: string | null;
  corpus: CorpusEntry[];
  setCorpus: Dispatch<SetStateAction<CorpusEntry[]>>;
  errorBank: ErrorBankEntry[];
  setErrorBank: Dispatch<SetStateAction<ErrorBankEntry[]>>;
  stuckPoints: StuckPointEntry[];
  setStuckPoints: Dispatch<SetStateAction<StuckPointEntry[]>>;
  learnedCollocations: Set<string>;
  setLearnedCollocations: Dispatch<SetStateAction<Set<string>>>;
  vocabCards: VocabCard[];
  setVocabCards: Dispatch<SetStateAction<VocabCard[]>>;
  foundryExampleOverrides: Record<string, FoundryExampleOverridePack>;
  setFoundryExampleOverrides: Dispatch<
    SetStateAction<Record<string, FoundryExampleOverridePack>>
  >;
  normalizeVocabCard: (raw: unknown) => VocabCard;
  normalizeFoundryExampleOverrides: (
    raw: unknown
  ) => Record<string, FoundryExampleOverridePack>;
};

const DEBOUNCE_MS = 3000;

function hasAnyLearningData(payload: {
  corpus: CorpusEntry[];
  errorBank: ErrorBankEntry[];
  stuckPoints: StuckPointEntry[];
  learnedCollocations: Iterable<string>;
  vocabCards: VocabCard[];
  foundryExampleOverrides: Record<string, FoundryExampleOverridePack>;
}) {
  return (
    payload.corpus.length > 0 ||
    payload.errorBank.length > 0 ||
    payload.stuckPoints.length > 0 ||
    Array.from(payload.learnedCollocations).length > 0 ||
    payload.vocabCards.length > 0 ||
    Object.keys(payload.foundryExampleOverrides).length > 0
  );
}

export function useCloudSync({
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
}: UseCloudSyncArgs) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() =>
    localStorage.getItem('ff_last_sync')
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    const v = localStorage.getItem('ff_auto_sync');
    if (v === null) return true;
    return v === '1';
  });

  const initialPullDone = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataVersion = useRef(0);
  const lastSyncedVersion = useRef(0);

  const saveLastSyncTime = useCallback((ts: string) => {
    setLastSyncTime(ts);
    localStorage.setItem('ff_last_sync', ts);
  }, []);

  const markSyncSuccess = useCallback((ts: string) => {
    saveLastSyncTime(ts);
    lastSyncedVersion.current = dataVersion.current;
    setSyncStatus('success');
    setTimeout(() => setSyncStatus('idle'), 2000);
  }, [saveLastSyncTime]);

  const buildPayload = useCallback(
    () => ({
      corpus,
      errorBank,
      stuckPoints,
      learnedCollocations: Array.from(learnedCollocations),
      vocabCards,
      foundryExampleOverrides,
    }),
    [corpus, errorBank, stuckPoints, learnedCollocations, vocabCards, foundryExampleOverrides]
  );

  const buildMergedPayload = useCallback(
    (data: Awaited<ReturnType<typeof syncLoad>>) => {
      const remoteVocab = (data.vocabCards || []).map(c => normalizeVocabCard(c));
      const remoteFoundry = normalizeFoundryExampleOverrides(data.foundryExampleOverrides);
      return {
        corpus: mergeByIdNewerTimestamp(corpus, data.corpus || []),
        errorBank: mergeByIdNewerTimestamp(errorBank, data.errorBank || []),
        stuckPoints: mergeByIdNewerTimestamp(stuckPoints, data.stuckPoints || []),
        learnedCollocations: Array.from(
          mergeLearnedCollocationIds(learnedCollocations, data.learnedCollocations)
        ),
        vocabCards: mergeVocabCards(vocabCards, remoteVocab).map(c => normalizeVocabCard(c)),
        foundryExampleOverrides: mergeFoundryExampleOverrides(foundryExampleOverrides, remoteFoundry),
      };
    },
    [
      corpus,
      errorBank,
      foundryExampleOverrides,
      learnedCollocations,
      normalizeFoundryExampleOverrides,
      normalizeVocabCard,
      stuckPoints,
      vocabCards,
    ]
  );

  const mergeRemoteData = useCallback(
    (data: Awaited<ReturnType<typeof syncLoad>>) => {
      const remoteVocab = (data.vocabCards || []).map(c => normalizeVocabCard(c));
      setCorpus(prev => mergeByIdNewerTimestamp(prev, data.corpus || []));
      setErrorBank(prev => mergeByIdNewerTimestamp(prev, data.errorBank || []));
      setStuckPoints(prev => mergeByIdNewerTimestamp(prev, data.stuckPoints || []));
      setLearnedCollocations(prev =>
        mergeLearnedCollocationIds(prev, data.learnedCollocations)
      );
      setVocabCards(prev =>
        mergeVocabCards(prev, remoteVocab).map(c => normalizeVocabCard(c))
      );
      setFoundryExampleOverrides(prev =>
        mergeFoundryExampleOverrides(
          prev,
          normalizeFoundryExampleOverrides(data.foundryExampleOverrides)
        )
      );
    },
    [
      normalizeFoundryExampleOverrides,
      normalizeVocabCard,
      setCorpus,
      setErrorBank,
      setFoundryExampleOverrides,
      setLearnedCollocations,
      setStuckPoints,
      setVocabCards,
    ]
  );

  const pushToCloud = useCallback(async () => {
    if (!accessToken) {
      setSyncError('未登录，无法同步');
      setSyncStatus('error');
      return;
    }
    setSyncStatus('saving');
    setSyncError(null);
    try {
      const result = await syncSave(accessToken, buildPayload());
      markSyncSuccess(result.timestamp);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error('Push to cloud failed:', e);
      setSyncError(e.message || 'Sync failed');
      setSyncStatus('error');
    }
  }, [accessToken, buildPayload, markSyncSuccess]);

  const pullFromCloud = useCallback(async () => {
    if (!accessToken) {
      setSyncError('未登录，无法同步');
      setSyncStatus('error');
      return;
    }
    setSyncStatus('loading');
    setSyncError(null);
    try {
      const data = await syncLoad(accessToken, lastSyncTime);
      mergeRemoteData(data);
      markSyncSuccess(data.serverTimestamp || new Date().toISOString());
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error('Pull from cloud failed:', e);
      setSyncError(e.message || 'Load failed');
      setSyncStatus('error');
    }
  }, [accessToken, lastSyncTime, markSyncSuccess, mergeRemoteData]);

  useEffect(() => {
    try {
      localStorage.setItem('ff_auto_sync', autoSyncEnabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [autoSyncEnabled]);

  useEffect(() => {
    dataVersion.current += 1;
  }, [corpus, errorBank, stuckPoints, learnedCollocations, vocabCards, foundryExampleOverrides]);

  useEffect(() => {
    if (accessToken && !initialPullDone.current) {
      initialPullDone.current = true;
      (async () => {
        setSyncStatus('loading');
        setSyncError(null);
        try {
          const data = await syncLoad(accessToken, lastSyncTime);
          const mergedPayload = buildMergedPayload(data);
          const hasCloudData =
            (data.corpus?.length > 0) ||
            (data.errorBank?.length > 0) ||
            (data.stuckPoints?.length > 0) ||
            (data.learnedCollocations?.length > 0) ||
            ((data.vocabCards?.length ?? 0) > 0) ||
            Object.keys(normalizeFoundryExampleOverrides(data.foundryExampleOverrides)).length > 0;
          const hasLocalData = hasAnyLearningData(buildPayload());

          setCorpus(mergedPayload.corpus);
          setErrorBank(mergedPayload.errorBank);
          setStuckPoints(mergedPayload.stuckPoints);
          setLearnedCollocations(new Set(mergedPayload.learnedCollocations));
          setVocabCards(mergedPayload.vocabCards);
          setFoundryExampleOverrides(mergedPayload.foundryExampleOverrides);

          if (hasCloudData || hasLocalData) {
            const result = await syncSave(accessToken, mergedPayload);
            markSyncSuccess(result.timestamp);
          } else {
            markSyncSuccess(data.serverTimestamp || new Date().toISOString());
          }
        } catch (err: unknown) {
          const e = err instanceof Error ? err : new Error(String(err));
          console.error('Initial pull from cloud failed:', e);
          const msg = e.message || 'Initial sync failed';
          setSyncError(msg);
          if (/invalid jwt/i.test(msg) || /session expired/i.test(msg)) {
            setSyncStatus('error');
            return;
          }
          setSyncStatus('idle');
        }
      })();
    }
    if (!accessToken) {
      initialPullDone.current = false;
    }
  }, [
    accessToken,
    buildMergedPayload,
    buildPayload,
    lastSyncTime,
    markSyncSuccess,
    mergeRemoteData,
    normalizeFoundryExampleOverrides,
  ]);

  useEffect(() => {
    if (!accessToken) return;
    const existing = localStorage.getItem('ff_auto_sync');
    if (existing !== null) return;
    setAutoSyncEnabled(true);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !autoSyncEnabled) return;
    if (
      syncStatus === 'error' &&
      syncError &&
      (/invalid jwt/i.test(syncError) || /session expired/i.test(syncError))
    ) {
      return;
    }
    if (dataVersion.current <= 2) return;
    if (dataVersion.current === lastSyncedVersion.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setSyncStatus('saving');
      setSyncError(null);
      try {
        const result = await syncSave(accessToken, buildPayload());
        markSyncSuccess(result.timestamp);
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error(String(err));
        console.error('Auto sync failed:', e);
        setSyncError(e.message || 'Auto sync failed');
        setSyncStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [
    accessToken,
    autoSyncEnabled,
    buildPayload,
    corpus,
    errorBank,
    foundryExampleOverrides,
    learnedCollocations,
    markSyncSuccess,
    stuckPoints,
    syncError,
    syncStatus,
    vocabCards,
  ]);

  return {
    autoSyncEnabled,
    lastSyncTime,
    pullFromCloud,
    pushToCloud,
    setAutoSyncEnabled,
    syncError,
    syncStatus,
  };
}
