import { projectId, publicAnonKey, functionSlug } from '/utils/supabase/info';
import { supabase } from './supabase';

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

export async function syncSave(
  _accessToken: string,
  data: {
    corpus: any[];
    errorBank: any[];
    stuckPoints: any[];
    learnedCollocations: string[];
    vocabCards?: any[];
  }
): Promise<{ success: boolean; timestamp: string }> {
  const token = await getValidAccessToken();

  const doSave = async (t: string) => {
    const resp = await fetch(`${BASE_URL}/sync/save`, {
      method: 'POST',
      headers: authHeaders(t),
      body: JSON.stringify(data),
    });
    if (!resp.ok) {
      const rawText = await resp.text().catch(() => '');
      let errMsg: string | undefined;
      try {
        const maybeJson = rawText ? JSON.parse(rawText) : null;
        errMsg = maybeJson?.error;
      } catch {
        errMsg = undefined;
      }
      const detail = errMsg || rawText || resp.statusText || `HTTP ${resp.status}`;
      console.error('Sync save error:', { status: resp.status, statusText: resp.statusText, detail });
      if (resp.status === 401) {
        return maybeRefreshAndRetry(doSave, detail, 1);
      }
      throw new Error(detail || 'Failed to save data');
    }
    return resp.json();
  };

  return doSave(token);
}

export async function syncLoad(_accessToken: string): Promise<{
  corpus: any[];
  errorBank: any[];
  stuckPoints: any[];
  learnedCollocations: string[];
  vocabCards?: any[];
}> {
  const token = await getValidAccessToken();

  const doLoad = async (t: string) => {
    const resp = await fetch(`${BASE_URL}/sync/load`, {
      headers: authHeaders(t),
    });
    if (!resp.ok) {
      const rawText = await resp.text().catch(() => '');
      let errMsg: string | undefined;
      try {
        const maybeJson = rawText ? JSON.parse(rawText) : null;
        errMsg = maybeJson?.error;
      } catch {
        errMsg = undefined;
      }
      const detail = errMsg || rawText || resp.statusText || `HTTP ${resp.status}`;
      console.error('Sync load error:', { status: resp.status, statusText: resp.statusText, detail });
      if (resp.status === 401) {
        return maybeRefreshAndRetry(doLoad, detail, 1);
      }
      throw new Error(detail || 'Failed to load data');
    }
    return resp.json();
  };

  return doLoad(token);
}

// ========== Azure Speech Token ==========

export async function getSpeechToken(): Promise<{ token: string; region: string }> {
  const resp = await fetch(`${BASE_URL}/speech/token`, {
    headers: headers(),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    console.error('Speech token error:', err);
    throw new Error(err.error || 'Failed to get speech token');
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
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    console.error('AI grammar check error:', err);
    throw new Error(err.error || 'Grammar check failed');
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
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    console.error('AI grammar tutor error:', err);
    throw new Error(err.error || 'Grammar tutor failed');
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
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    console.error('AI translate-sentence error:', err);
    throw new Error(err.error || 'Translation failed');
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
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    console.error('AI stuck suggest error:', err);
    throw new Error(err.error || 'Stuck suggestion failed');
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
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    console.error('AI evaluate error:', err);
    throw new Error(err.error || 'Evaluation failed');
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
    const raw = await resp.text().catch(() => '');
    let err: { error?: string } = {};
    try {
      err = raw ? JSON.parse(raw) : {};
    } catch {
      err = { error: raw || resp.statusText };
    }
    console.error('AI vocab-card error:', { status: resp.status, err, raw: raw?.slice?.(0, 200) });
    if (resp.status === 404) {
      throw new Error(
        '词卡接口 404：云端尚未部署最新 Edge 函数。请在项目根目录执行：npx supabase login && npx supabase functions deploy make-server-1fc434d6 --project-ref 你的项目 ref'
      );
    }
    throw new Error(err.error || raw || 'Vocab card generation failed');
  }
  return resp.json();
}