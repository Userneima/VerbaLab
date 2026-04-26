import { z } from 'zod';
import type {
  CorpusEntry,
  ErrorBankEntry,
  StuckPointEntry,
  VocabCard,
} from '../../store/useStore';
import type { FoundryExampleOverridePack } from '../syncMerge';
import {
  BASE_URL,
  authHeaders,
  getValidAccessToken,
  maybeRefreshAndRetry,
  parseErrorResponse,
} from './client';

export type SyncLearningPayload = {
  corpus: CorpusEntry[];
  errorBank: ErrorBankEntry[];
  stuckPoints: StuckPointEntry[];
  learnedCollocations: string[];
  vocabCards?: VocabCard[];
  /** 资产区：按搭配 id 存自定义例句包 */
  foundryExampleOverrides?: Record<string, FoundryExampleOverridePack>;
};

export type SyncLoadResult = SyncLearningPayload & { serverTimestamp?: string };

const foundryPackSchema = z.object({
  items: z.array(z.object({ content: z.string(), chinese: z.string().optional() })),
  updatedAt: z.string(),
});

const syncLoadSchema = z.object({
  corpus: z.array(z.unknown()).default([]),
  errorBank: z.array(z.unknown()).default([]),
  stuckPoints: z.array(z.unknown()).default([]),
  learnedCollocations: z.array(z.string()).default([]),
  vocabCards: z.array(z.unknown()).default([]),
  foundryExampleOverrides: z.record(z.string(), foundryPackSchema).default({}),
  serverTimestamp: z.string().optional(),
});

export function parseSyncLoadResult(raw: unknown): SyncLoadResult {
  const parsed = syncLoadSchema.parse(raw);
  return {
    corpus: parsed.corpus as CorpusEntry[],
    errorBank: parsed.errorBank as ErrorBankEntry[],
    stuckPoints: parsed.stuckPoints as StuckPointEntry[],
    learnedCollocations: parsed.learnedCollocations,
    vocabCards: parsed.vocabCards as VocabCard[],
    foundryExampleOverrides: parsed.foundryExampleOverrides as Record<string, FoundryExampleOverridePack>,
    serverTimestamp: parsed.serverTimestamp,
  };
}

export async function syncSave(
  _accessToken: string,
  data: SyncLearningPayload
): Promise<{ success: boolean; timestamp: string }> {
  const token = await getValidAccessToken();

  const doSave = async (t: string): Promise<{ success: boolean; timestamp: string }> => {
    const resp = await fetch(`${BASE_URL}/sync/save`, {
      method: 'POST',
      headers: authHeaders(t),
      body: JSON.stringify(data),
    });
    if (!resp.ok) {
      const detail = await parseErrorResponse(resp);
      console.error('Sync save error:', { status: resp.status, statusText: resp.statusText, detail });
      if (resp.status === 401) {
        return maybeRefreshAndRetry(doSave, detail, 1);
      }
      throw new Error(detail || 'Failed to save data');
    }
    const body: unknown = await resp.json();
    return body as { success: boolean; timestamp: string };
  };

  return doSave(token);
}

export async function syncLoad(_accessToken: string, since?: string | null): Promise<SyncLoadResult> {
  const token = await getValidAccessToken();

  const doLoad = async (t: string): Promise<SyncLoadResult> => {
    const url = new URL(`${BASE_URL}/sync/load`);
    if (since) url.searchParams.set('since', since);
    const resp = await fetch(url.toString(), {
      headers: authHeaders(t),
    });
    if (!resp.ok) {
      const detail = await parseErrorResponse(resp);
      console.error('Sync load error:', { status: resp.status, statusText: resp.statusText, detail });
      if (resp.status === 401) {
        return maybeRefreshAndRetry(doLoad, detail, 1);
      }
      throw new Error(detail || 'Failed to load data');
    }
    const json: unknown = await resp.json();
    return parseSyncLoadResult(json);
  };

  return doLoad(token);
}
