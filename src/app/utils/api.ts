import { projectId, publicAnonKey, functionSlug } from '/utils/supabase/info';
import type {
  CorpusEntry,
  ErrorBankEntry,
  StuckPointEntry,
  VocabCard,
} from '../store/useStore';
import type { FoundryExampleOverridePack } from './syncMerge';
import { supabase } from './supabase';
import { z } from 'zod';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/${functionSlug}`;

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
});

// Create auth headers using the user's access token
const authHeaders = (accessToken: string) => ({
  'Content-Type': 'application/json',
  apikey: publicAnonKey,
  'Authorization': `Bearer ${accessToken}`,
});

async function parseErrorResponse(resp: Response): Promise<string> {
  const rawText = await resp.text().catch(() => '');
  let errMsg: string | undefined;
  try {
    const maybeJson = rawText ? JSON.parse(rawText) : null;
    errMsg = maybeJson?.error;
  } catch {
    errMsg = undefined;
  }
  return errMsg || rawText || resp.statusText || `HTTP ${resp.status}`;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshed = await supabase.auth.refreshSession();
      return refreshed.data.session?.access_token ?? null;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function getValidAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) return token;

  const refreshedToken = await refreshAccessTokenOnce();
  if (refreshedToken) return refreshedToken;

  throw new Error('Not signed in');
}

async function maybeRefreshAndRetry<T>(
  fn: (token: string) => Promise<T>,
  errDetail: string,
  retriesLeft: number
): Promise<T> {
  if (retriesLeft <= 0) throw new Error('Session expired. Please sign in again.');
  if (!/invalid jwt/i.test(errDetail)) throw new Error(errDetail);

  const token = await refreshAccessTokenOnce();
  if (!token) {
    try { await supabase.auth.signOut(); } catch {}
    throw new Error('Session expired. Please sign in again.');
  }

  return fn(token);
}

// ========== Data Sync ==========

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

function parseSyncLoadResult(raw: unknown): SyncLoadResult {
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

export const __apiTestables = {
  parseSyncLoadResult,
};

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

// ========== Azure Speech Token ==========

export async function getSpeechToken(): Promise<{ token: string; region: string }> {
  const resp = await fetch(`${BASE_URL}/speech/token`, {
    headers: headers(),
  });
  if (!resp.ok) {
    const detail = await parseErrorResponse(resp);
    console.error('Speech token error:', detail);
    throw new Error(detail || 'Failed to get speech token');
  }
  return resp.json();
}

// ========== DeepSeek AI ==========

export async function aiGrammarCheck(sentence: string, collocation: string): Promise<{
  isCorrect: boolean;
  errors: Array<{
    type: string;
    description: string;
    hint: string;
    grammarPoint: string;
  }>;
  overallHint: string;
}> {
  const resp = await fetch(`${BASE_URL}/ai/grammar-check`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ sentence, collocation }),
  });
  if (!resp.ok) {
    const detail = await parseErrorResponse(resp);
    console.error('AI grammar check error:', detail);
    throw new Error(detail || 'Grammar check failed');
  }
  return resp.json();
}

/** 实验室：语法未通过后的追问，用中文讲解语法点（不代改原句） */
export async function aiGrammarTutor(payload: {
  sentence: string;
  collocation: string;
  chineseContext: string;
  errors: Array<{ description: string; hint: string; grammarPoint: string }>;
  overallHint: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ reply: string }> {
  const resp = await fetch(`${BASE_URL}/ai/grammar-tutor`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const detail = await parseErrorResponse(resp);
    console.error('AI grammar tutor error:', detail);
    throw new Error(detail || 'Grammar tutor failed');
  }
  return resp.json();
}

/** 检测语法正确但为中式英语的句子，返回母语者版本与思路 */
/** 将英文例句译为自然中文（个人语料库等） */
export async function aiTranslateSentence(text: string): Promise<{ translation: string }> {
  const resp = await fetch(`${BASE_URL}/ai/translate-sentence`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) {
    const detail = await parseErrorResponse(resp);
    console.error('AI translate-sentence error:', detail);
    throw new Error(detail || 'Translation failed');
  }
  return resp.json();
}

export async function aiChinglishCheck(sentence: string, collocation: string): Promise<{
  isChinglish: boolean;
  nativeVersion?: string;
  nativeThinking?: string;
}> {
  try {
    const resp = await fetch(`${BASE_URL}/ai/chinglish-check`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ sentence, collocation }),
    });
    if (!resp.ok) return { isChinglish: false };
    return resp.json();
  } catch {
    return { isChinglish: false };
  }
}

export async function aiStuckSuggest(
  chineseThought: string,
  corpusSentences: Array<{ userSentence: string; collocation: string; verb: string }>,
  verbCollocations: Array<{ phrase: string; meaning: string }>
): Promise<{ type: 'corpus' | 'verb' | 'paraphrase'; suggestion: string }> {
  const resp = await fetch(`${BASE_URL}/ai/stuck-suggest`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ chineseThought, corpusSentences, verbCollocations }),
  });
  if (!resp.ok) {
    const detail = await parseErrorResponse(resp);
    console.error('AI stuck suggest error:', detail);
    throw new Error(detail || 'Stuck suggestion failed');
  }
  return resp.json();
}

export async function aiEvaluateAnswer(
  question: string,
  answer: string,
  part: number
): Promise<{
  score: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  verbsUsed: string[];
  feedback: string[];
}> {
  const resp = await fetch(`${BASE_URL}/ai/evaluate-answer`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ question, answer, part }),
  });
  if (!resp.ok) {
    const detail = await parseErrorResponse(resp);
    console.error('AI evaluate error:', detail);
    throw new Error(detail || 'Evaluation failed');
  }
  return resp.json();
}

/** 词卡工坊：按雅思题 + 搭配白名单生成单词多题例句 */
export async function aiGenerateVocabCard(payload: {
  headword: string;
  sense?: string;
  questions: Array<{ id: string; part: number; topic: string; question: string }>;
  collocations: Array<{ phrase: string; meaning: string; verb: string }>;
}): Promise<{
  headword: string;
  sense?: string;
  items: Array<{
    questionId: string;
    sentence: string;
    collocationsUsed: string[];
    chinese?: string;
  }>;
}> {
  const resp = await fetch(`${BASE_URL}/ai/vocab-card`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const detail = await parseErrorResponse(resp);
    console.error('AI vocab-card error:', { status: resp.status, detail: detail?.slice?.(0, 200) });
    if (resp.status === 404) {
      throw new Error(
        '词卡接口 404：云端尚未部署最新 Edge 函数。请在项目根目录执行：npx supabase login && npx supabase functions deploy make-server-1fc434d6 --project-ref 你的项目 ref'
      );
    }
    throw new Error(detail || 'Vocab card generation failed');
  }
  return resp.json();
}