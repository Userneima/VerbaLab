import { projectId, publicAnonKey, functionSlug } from '/utils/supabase/info';
import { supabase } from '../supabase';

export const BASE_URL = `https://${projectId}.supabase.co/functions/v1/${functionSlug}`;

export const authHeaders = (accessToken: string) => ({
  'Content-Type': 'application/json',
  apikey: publicAnonKey,
  'Authorization': `Bearer ${accessToken}`,
});

export function mapFetchFailureToMessage(err: unknown): Error {
  const m = err instanceof Error ? err.message : String(err);
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(m)) {
    return new Error(
      '无法连接词卡/AI 服务（网络请求失败）。请检查：是否已登录；网络是否正常；若部署在 Vercel 等线上地址，需在 Supabase Edge 函数环境变量 CORS_ALLOW_ORIGINS 中加入你的站点完整 Origin（含 https）。本地开发可使用任意 localhost 端口；修改 CORS 后请重新部署函数 make-server-1fc434d6。'
    );
  }
  return err instanceof Error ? err : new Error(m);
}

export async function parseErrorResponse(resp: Response): Promise<string> {
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

export async function refreshAccessTokenOnce(): Promise<string | null> {
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

export async function getValidAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) return token;

  const refreshedToken = await refreshAccessTokenOnce();
  if (refreshedToken) return refreshedToken;

  throw new Error('Not signed in');
}

export async function maybeRefreshAndRetry<T>(
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

export async function getAiJson<T>(path: string): Promise<T> {
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

export async function postAiJson<T>(path: string, body: unknown): Promise<T> {
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
