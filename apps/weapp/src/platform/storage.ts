const TOKEN_KEY = 'verbalab_weapp_token';
const REFRESH_TOKEN_KEY = 'verbalab_weapp_refresh_token';
const PROFILE_KEY = 'verbalab_weapp_user_profile';

export type WeappUserProfile = {
  userId: string;
  expiresAt: string;
  isNewUser?: boolean;
  email?: string;
  provider?: 'wechat' | 'password';
};

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

export function getRefreshToken(): string | null {
  return wx.getStorageSync(REFRESH_TOKEN_KEY) || null;
}

export function setRefreshToken(token: string) {
  wx.setStorageSync(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken() {
  wx.removeStorageSync(REFRESH_TOKEN_KEY);
}

export function getUserProfile(): WeappUserProfile | null {
  return getStorageJson<WeappUserProfile | null>(PROFILE_KEY, null);
}

export function setUserProfile(profile: WeappUserProfile) {
  setStorageJson(PROFILE_KEY, profile);
}

export function clearUserProfile() {
  wx.removeStorageSync(PROFILE_KEY);
}

export function clearAuthState() {
  clearAuthToken();
  clearRefreshToken();
  clearUserProfile();
}
