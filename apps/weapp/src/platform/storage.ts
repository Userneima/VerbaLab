const TOKEN_KEY = 'verbalab_weapp_token';
const REFRESH_TOKEN_KEY = 'verbalab_weapp_refresh_token';
const PROFILE_KEY = 'verbalab_weapp_user_profile';
const ASSET_OPEN_INTENT_KEY = 'verbalab_weapp_asset_open_intent';

export type WeappUserProfile = {
  userId: string;
  expiresAt: string;
  isNewUser?: boolean;
  email?: string;
  provider?: 'wechat' | 'password';
};

export type AssetOpenIntent = {
  tab: 'stuck' | 'vocab';
  itemId?: string;
  createdAt: string;
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
  const token = wx.getStorageSync(TOKEN_KEY) || null;
  if (!token) return null;

  const profile = getUserProfile();
  const expiresAt = profile?.expiresAt ? Date.parse(profile.expiresAt) : Number.NaN;
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    clearAuthState();
    return null;
  }

  return token;
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

export function setAssetOpenIntent(intent: AssetOpenIntent) {
  setStorageJson(ASSET_OPEN_INTENT_KEY, intent);
}

export function consumeAssetOpenIntent(): AssetOpenIntent | null {
  const intent = getStorageJson<AssetOpenIntent | null>(ASSET_OPEN_INTENT_KEY, null);
  wx.removeStorageSync(ASSET_OPEN_INTENT_KEY);
  if (!intent?.createdAt) return null;

  // Ignore stale navigation intents from previous sessions.
  if (Date.now() - Date.parse(intent.createdAt) > 60_000) return null;
  return intent;
}
