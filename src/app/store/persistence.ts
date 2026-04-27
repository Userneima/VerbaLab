import type { FoundryExampleOverridePack } from '../utils/syncMerge';
import { isBlankVocabCard } from '../utils/vocabCardBlank';
import { getAppStorage } from '../platform/storage';
import type {
  CorpusEntry,
  ErrorBankEntry,
  StuckPointEntry,
  VocabCard,
} from './types';
import {
  normalizeFoundryExampleOverrides,
  normalizeLegacyErrorEntry,
  normalizeVocabCard,
} from './types';

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = getAppStorage().getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (key === 'ff_foundry_examples') {
        return normalizeFoundryExampleOverrides(parsed) as unknown as T;
      }
      if (key === 'ff_learned' && Array.isArray(parsed)) {
        return new Set(parsed) as unknown as T;
      }
      if (key === 'ff_errors' && Array.isArray(parsed)) {
        return parsed.map((e: any) => normalizeLegacyErrorEntry(e)) as unknown as T;
      }
      if (key === 'ff_vocab_cards' && Array.isArray(parsed)) {
        return parsed.map((c: any) => normalizeVocabCard(c)) as unknown as T;
      }
      return parsed;
    }
  } catch {
    // ignore storage parse failures and fall back
  }
  return defaultValue;
}

export function saveToStorage<T>(key: string, value: T) {
  try {
    if (value instanceof Set) {
      getAppStorage().setItem(key, JSON.stringify(Array.from(value)));
    } else {
      getAppStorage().setItem(key, JSON.stringify(value));
    }
  } catch {
    // ignore storage write failures
  }
}

export function loadCorpus(): CorpusEntry[] {
  return loadFromStorage<CorpusEntry[]>('ff_corpus', []);
}

export function loadErrorBank(): ErrorBankEntry[] {
  return loadFromStorage<ErrorBankEntry[]>('ff_errors', []);
}

export function loadStuckPoints(): StuckPointEntry[] {
  return loadFromStorage<StuckPointEntry[]>('ff_stuck', []);
}

export function loadLearnedCollocations(): Set<string> {
  return loadFromStorage<Set<string>>('ff_learned', new Set());
}

export function loadVocabCards(): VocabCard[] {
  const raw = loadFromStorage<VocabCard[]>('ff_vocab_cards', []);
  return raw.filter((card) => !isBlankVocabCard(card));
}

export function loadFoundryExampleOverrides(): Record<string, FoundryExampleOverridePack> {
  return loadFromStorage<Record<string, FoundryExampleOverridePack>>('ff_foundry_examples', {});
}
