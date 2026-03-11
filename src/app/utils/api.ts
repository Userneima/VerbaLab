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

/** 检测语法正确但为中式英语的句子，返回母语者版本与思路 */
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