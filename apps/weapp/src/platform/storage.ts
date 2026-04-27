const TOKEN_KEY = 'verbalab_weapp_token';

export function getStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = wx.getStorageSync(key);
    if (!raw) return fallback;
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

export function setStorageJson<T>(key: string, value: T) {
  wx.setStorageSync(key, JSON.stringify(value));
}

export function getAuthToken(): string | null {
  return wx.getStorageSync(TOKEN_KEY) || null;
}

export function setAuthToken(token: string) {
  wx.setStorageSync(TOKEN_KEY, token);
}

export function clearAuthToken() {
  wx.removeStorageSync(TOKEN_KEY);
}
