import { projectId, publicAnonKey, functionSlug } from '/utils/supabase/info';
import type {
  CorpusEntry,
  ErrorBankEntry,
  StuckPointEntry,
  VocabCard,
  VocabCardRegisterGuide,
} from '../store/useStore';
import type { FoundryExampleOverridePack } from './syncMerge';
import { supabase } from './supabase';
import { z } from 'zod';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/${functionSlug}`;

// Create auth headers using the user's access token
const authHeaders = (accessToken: string) => ({
  'Content-Type': 'application/json',
  apikey: publicAnonKey,
  'Authorization': `Bearer ${accessToken}`,
});

/** fetch 级失败（含 CORS、断网、DNS）在浏览器里多为 TypeError: Failed to fetch */
function mapFetchFailureToMessage(err: unknown): Error {
  const m = err instanceof Error ? err.message : String(err);
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(m)) {
    return new Error(
      '无法连接词卡/AI 服务（网络请求失败）。请检查：是否已登录；网络是否正常；若部署在 Vercel 等线上地址，需在 Supabase Edge 函数环境变量 CORS_ALLOW_ORIGINS 中加入你的站点完整 Origin（含 https）。本地开发可使用任意 localhost 端口；修改 CORS 后请重新部署函数 make-server-1fc434d6。'
    );
  }
  return err instanceof Error ? err : new Error(m);
}

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

/** Edge `/ai/*` and `/speech/*` require a logged-in user JWT (rate limit per user). */
async function getAiJson<T>(path: string): Promise<T> {
  let token: string;
  try {
    token = await getValidAccessToken();
  } catch (e) {
    throw mapFetchFailureToMessage(e);
  }
  const attempt = async (t: string): Promise<T> => {
    let resp: Response;
    try {
      resp = await fetch(`${BASE_URL}${path}`, { headers: authHeaders(t) });
    } catch (e) {
      throw mapFetchFailureToMessage(e);
    }
    if (!resp.ok) {
      const detail = await parseErrorResponse(resp);
      if (resp.status === 401) {
        return maybeRefreshAndRetry((t2) => attempt(t2), detail, 1);
      }
      throw new Error(detail || 'Request failed');
    }
    return resp.json() as Promise<T>;
  };
  return attempt(token);
}

async function postAiJson<T>(path: string, body: unknown): Promise<T> {
  let token: string;
  try {
    token = await getValidAccessToken();
  } catch (e) {
    throw mapFetchFailureToMessage(e);
  }
  const attempt = async (t: string): Promise<T> => {
    let resp: Response;
    try {
      resp = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: authHeaders(t),
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw mapFetchFailureToMessage(e);
    }
    if (!resp.ok) {
      const detail = await parseErrorResponse(resp);
      if (resp.status === 401) {
        return maybeRefreshAndRetry((t2) => attempt(t2), detail, 1);
      }
      throw new Error(detail || 'Request failed');
    }
    return resp.json() as Promise<T>;
  };
  return attempt(token);
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

const stuckSuggestExampleSchema = z.object({
  sentence: z.string().trim().min(1),
  chinese: z.string().trim().optional(),
  noteZh: z.string().trim().optional(),
});

const stuckSuggestSchema = z.object({
  type: z.enum(['corpus', 'verb', 'paraphrase']).default('paraphrase'),
  suggestion: z.string().default(''),
  recommendedExpression: z.string().trim().optional(),
  guidanceZh: z.string().trim().optional(),
  examples: z.array(stuckSuggestExampleSchema).default([]),
});

export type StuckSuggestResult = z.infer<typeof stuckSuggestSchema>;

const inviteItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  note: z.string().nullable().optional(),
  created_at: z.string(),
  used_at: z.string().nullable().optional(),
});

const inviteListSchema = z.object({
  invites: z.array(inviteItemSchema).default([]),
  totalUnused: z.number().int().nonnegative().default(0),
  totalUsed: z.number().int().nonnegative().default(0),
});

const inviteGenerateSchema = z.object({
  invites: z.array(inviteItemSchema).default([]),
  generatedCount: z.number().int().nonnegative().default(0),
});

export type InviteItem = z.infer<typeof inviteItemSchema>;
export type InviteListResult = z.infer<typeof inviteListSchema>;
export type InviteGenerateResult = z.infer<typeof inviteGenerateSchema>;

function parseStuckSuggestResult(raw: unknown): StuckSuggestResult {
  const parsed = stuckSuggestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      type: 'paraphrase',
      suggestion: '',
      guidanceZh: undefined,
      examples: [],
    };
  }
  const value = parsed.data;
  return {
    type: value.type,
    suggestion: value.suggestion.trim(),
    recommendedExpression: value.recommendedExpression?.trim() || undefined,
    guidanceZh: value.guidanceZh?.trim() || undefined,
    examples: value.examples.map((example) => ({
      sentence: example.sentence.trim(),
      chinese: example.chinese?.trim() || undefined,
      noteZh: example.noteZh?.trim() || undefined,
    })),
  };
}

function parseInviteListResult(raw: unknown): InviteListResult {
  return inviteListSchema.parse(raw);
}

function parseInviteGenerateResult(raw: unknown): InviteGenerateResult {
  return inviteGenerateSchema.parse(raw);
}

export const __apiTestables = {
  parseSyncLoadResult,
  parseStuckSuggestResult,
  parseInviteListResult,
  parseInviteGenerateResult,
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
  try {
    return await getAiJson<{ token: string; region: string }>('/speech/token');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to get speech token';
    console.error('Speech token error:', msg);
    throw new Error(msg);
  }
}

// ========== DeepSeek AI ==========

export async function aiGrammarCheck(sentence: string, collocation: string): Promise<{
  isCorrect: boolean;
  correctedSentence?: string;
  errors: Array<{
    type: string;
    description: string;
    hint: string;
    grammarPoint: string;
  }>;
  overallHint: string;
}> {
  try {
    return await postAiJson('/ai/grammar-check', { sentence, collocation });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Grammar check failed';
    console.error('AI grammar check error:', msg);
    throw new Error(msg);
  }
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
  try {
    return await postAiJson('/ai/grammar-tutor', payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Grammar tutor failed';
    console.error('AI grammar tutor error:', msg);
    throw new Error(msg);
  }
}

/** 检测语法正确但为中式英语的句子，返回母语者版本与思路 */
/** 将英文例句译为自然中文（个人语料库等） */
export async function aiTranslateSentence(text: string): Promise<{ translation: string }> {
  try {
    return await postAiJson('/ai/translate-sentence', { text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Translation failed';
    console.error('AI translate-sentence error:', msg);
    throw new Error(msg);
  }
}

export async function aiChinglishCheck(sentence: string, collocation: string): Promise<{
  isChinglish: boolean;
  nativeVersion?: string;
  nativeThinking?: string;
}> {
  try {
    return await postAiJson('/ai/chinglish-check', { sentence, collocation });
  } catch {
    return { isChinglish: false };
  }
}

export async function aiStuckSuggest(
  chineseThought: string,
  corpusSentences: Array<{ userSentence: string; collocation: string; verb: string }>,
  verbCollocations: Array<{ phrase: string; meaning: string }>
): Promise<StuckSuggestResult> {
  try {
    const raw = await postAiJson<unknown>('/ai/stuck-suggest', {
      chineseThought,
      corpusSentences,
      verbCollocations,
    });
    return parseStuckSuggestResult(raw);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Stuck suggestion failed';
    console.error('AI stuck suggest error:', msg);
    throw new Error(msg);
  }
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
  try {
    return await postAiJson('/ai/evaluate-answer', { question, answer, part });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Evaluation failed';
    console.error('AI evaluate error:', msg);
    throw new Error(msg);
  }
}

export async function getInviteInventory(limit = 40): Promise<InviteListResult> {
  const token = await getValidAccessToken();

  const doLoad = async (t: string): Promise<InviteListResult> => {
    let resp: Response;
    try {
      const url = new URL(`${BASE_URL}/invites`);
      url.searchParams.set('limit', String(limit));
      resp = await fetch(url.toString(), {
        headers: authHeaders(t),
      });
    } catch (e) {
      throw mapFetchFailureToMessage(e);
    }
    if (!resp.ok) {
      const detail = await parseErrorResponse(resp);
      if (resp.status === 401) {
        return maybeRefreshAndRetry(doLoad, detail, 1);
      }
      throw new Error(detail || 'Failed to load invites');
    }
    const json: unknown = await resp.json();
    return parseInviteListResult(json);
  };

  return doLoad(token);
}

export async function generateInvites(payload: {
  count: number;
  note?: string;
}): Promise<InviteGenerateResult> {
  const token = await getValidAccessToken();

  const doGenerate = async (t: string): Promise<InviteGenerateResult> => {
    let resp: Response;
    try {
      resp = await fetch(`${BASE_URL}/invites/generate`, {
        method: 'POST',
        headers: authHeaders(t),
        body: JSON.stringify(payload),
      });
    } catch (e) {
      throw mapFetchFailureToMessage(e);
    }
    if (!resp.ok) {
      const detail = await parseErrorResponse(resp);
      if (resp.status === 401) {
        return maybeRefreshAndRetry(doGenerate, detail, 1);
      }
      throw new Error(detail || 'Failed to generate invites');
    }
    const json: unknown = await resp.json();
    return parseInviteGenerateResult(json);
  };

  return doGenerate(token);
}

/** 词卡工坊：语体判断 + 按搭配白名单生成例句（口语目标 1 条；若原词偏书面与口语目标不同，再追加 1 条「原词在日常里怎么说」） */
export async function aiGenerateVocabCard(payload: {
  headword: string;
  sense?: string;
  collocations: Array<{ phrase: string; meaning: string; verb: string }>;
}): Promise<{
  headword: string;
  sense?: string;
  spokenPracticePhrase: string;
  isCommonInSpokenEnglish: boolean;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  registerNoteZh?: string;
  registerGuide?: VocabCardRegisterGuide;
  items: Array<{
    sentence: string;
    collocationsUsed: string[];
    chinese?: string;
  }>;
}> {
  try {
    return await postAiJson('/ai/vocab-card', payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Vocab card generation failed';
    console.error('AI vocab-card error:', { detail: msg?.slice?.(0, 200) });
    if (/404|not found/i.test(msg)) {
      throw new Error(
        '词卡接口 404：云端尚未部署最新 Edge 函数。请在项目根目录执行：npx supabase login && npx supabase functions deploy make-server-1fc434d6 --project-ref 你的项目 ref'
      );
    }
    if (/questions array is required/i.test(msg)) {
      throw new Error(
        '词卡云端仍是旧版接口（要求 questions）。请重新部署 Edge 函数：npx supabase functions deploy make-server-1fc434d6 --project-ref <Project ID>，与仓库中 supabase/functions/make-server-1fc434d6 代码保持一致。'
      );
    }
    throw new Error(msg);
  }
}

/** 仅生成语体解析：用于旧卡补全 registerGuide / note / 替换词 */
export async function aiGenerateVocabCardRegisterGuide(payload: {
  headword: string;
  sense?: string;
}): Promise<{
  headword: string;
  sense?: string;
  spokenPracticePhrase: string;
  isCommonInSpokenEnglish: boolean;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  registerNoteZh?: string;
  registerGuide?: VocabCardRegisterGuide;
}> {
  try {
    return await postAiJson('/ai/vocab-card-register-guide', payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Register guide generation failed';
    console.error('AI vocab-card-register-guide error:', { detail: String(msg).slice(0, 200) });
    if (/404|not found/i.test(msg)) {
      throw new Error(
        '语体解析接口 404：云端尚未部署该路由。请重新部署 Edge 函数 make-server-1fc434d6。'
      );
    }
    throw new Error(msg);
  }
}

/** 仅生成一条「原词·日常」例句（旧卡补充，或单独扩展） */
export async function aiGenerateVocabCardOriginalDaily(payload: {
  headword: string;
  sense?: string;
  collocations: Array<{ phrase: string; meaning: string; verb: string }>;
}): Promise<{
  item: {
    sentence: string;
    collocationsUsed: string[];
    chinese?: string;
  };
}> {
  try {
    return await postAiJson('/ai/vocab-card-original-daily', payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Original-daily sentence failed';
    console.error('AI vocab-card-original-daily error:', { detail: String(msg).slice(0, 200) });
    if (/404|not found/i.test(msg)) {
      throw new Error(
        '原词例句接口 404：云端尚未部署该路由。请在项目根目录执行：npx supabase functions deploy make-server-1fc434d6 --project-ref <Project ref>，确保 supabase/functions/make-server-1fc434d6 含 /ai/vocab-card-original-daily。'
      );
    }
    throw new Error(msg);
  }
}
