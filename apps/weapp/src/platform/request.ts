import { FUNCTION_BASE_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import {
  clearAuthState,
  getAuthToken,
  getRefreshToken,
  getUserProfile,
  setAuthToken,
  setRefreshToken,
  setUserProfile,
} from './storage';

export type RequestOptions = {
  method?: 'GET' | 'POST';
  path: string;
  data?: unknown;
};

type SupabaseRefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id?: string;
    email?: string;
  };
};

function normalizeRequestFailMessage(errMsg?: string): string {
  const raw = errMsg || 'request:fail';

  if (raw.includes('url not in domain list')) {
    return '网络请求被小程序拦截：请在微信公众平台 request 合法域名里加入 https://ztlrrovudbkmqqjaqhfu.supabase.co，并在开发者工具里刷新项目配置。';
  }

  if (raw.includes('timeout')) {
    return '请求超时：后端响应太慢或当前网络不稳定，请稍后再试。';
  }

  if (raw.includes('ERR_NAME_NOT_RESOLVED') || raw.includes('resolve')) {
    return '域名解析失败：当前网络无法访问 Supabase 服务，请切换网络后再试。';
  }

  if (raw.includes('ERR_CONNECTION') || raw.includes('abort') || raw === 'request:fail') {
    return `网络请求失败：小程序没有连上 AI 服务。请检查合法域名、开发者工具“不校验合法域名”设置或当前网络。原始错误：${raw}`;
  }

  return `网络请求失败：${raw}`;
}

function refreshSupabaseSession(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(null);

  return new Promise((resolve) => {
    wx.request({
      url: `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      method: 'POST',
      data: { refresh_token: refreshToken },
      header: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          resolve(null);
          return;
        }
        const body = res.data as SupabaseRefreshResponse;
        if (!body.access_token) {
          resolve(null);
          return;
        }
        const expiresAt = new Date(Date.now() + (body.expires_in || 3600) * 1000).toISOString();
        setAuthToken(body.access_token);
        if (body.refresh_token) setRefreshToken(body.refresh_token);
        const currentProfile = getUserProfile();
        setUserProfile({
          userId: body.user?.id || currentProfile?.userId || '',
          email: body.user?.email || currentProfile?.email,
          expiresAt,
          provider: 'password',
        });
        resolve(body.access_token);
      },
      fail() {
        resolve(null);
      },
    });
  });
}

function sendRequest<T>(
  { method = 'GET', path, data }: RequestOptions,
  token: string | null,
): Promise<{ ok: true; data: T } | { ok: false; statusCode: number; message: string }> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${FUNCTION_BASE_URL}${path}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'X-VerbaLab-Client': 'weapp',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, data: res.data as T });
          return;
        }
        const body = res.data as { error?: string } | string | undefined;
        const message =
          typeof body === 'object' && body?.error
            ? body.error
            : typeof body === 'string'
            ? body
            : `Request failed: ${res.statusCode}`;
        resolve({ ok: false, statusCode: res.statusCode, message });
      },
      fail(err) {
        reject(new Error(normalizeRequestFailMessage(err.errMsg)));
      },
    });
  });
}

export async function requestJson<T>(options: RequestOptions): Promise<T> {
  const first = await sendRequest<T>(options, getAuthToken());
  if (first.ok) return first.data;

  if (first.statusCode === 401) {
    const refreshedToken = await refreshSupabaseSession();
    if (refreshedToken) {
      const retry = await sendRequest<T>(options, refreshedToken);
      if (retry.ok) return retry.data;
      throw new Error(retry.message);
    }
    clearAuthState();
  }

  throw new Error(first.message);
}
