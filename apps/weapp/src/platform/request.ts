import { getAuthToken } from './storage';

const FALLBACK_FUNCTION_BASE_URL = 'https://ztlrrovudbkmqqjaqhfu.supabase.co/functions/v1/make-server-1fc434d6';

export type RequestOptions = {
  method?: 'GET' | 'POST';
  path: string;
  data?: unknown;
};

function getFunctionBaseUrl() {
  return process.env.TARO_APP_FUNCTION_BASE_URL || FALLBACK_FUNCTION_BASE_URL;
}

export function requestJson<T>({ method = 'GET', path, data }: RequestOptions): Promise<T> {
  const token = getAuthToken();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getFunctionBaseUrl()}${path}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
          return;
        }
        const body = res.data as { error?: string } | string | undefined;
        const message =
          typeof body === 'object' && body?.error
            ? body.error
            : typeof body === 'string'
            ? body
            : `Request failed: ${res.statusCode}`;
        reject(new Error(message));
      },
      fail(err) {
        reject(new Error(err.errMsg || 'Network request failed'));
      },
    });
  });
}
