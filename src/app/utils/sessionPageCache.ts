export type SessionPageCacheEnvelope<T> = {
  cachedAt: string;
  value: T;
};

type CacheStorageMode = 'session' | 'local';

function getStorage(mode: CacheStorageMode) {
  return mode === 'local' ? window.localStorage : window.sessionStorage;
}

export function loadSessionPageCache<T>(
  key: string,
  parser: (raw: unknown) => T,
  mode: CacheStorageMode = 'session',
): SessionPageCacheEnvelope<T> | null {
  try {
    const raw = getStorage(mode).getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionPageCacheEnvelope<unknown>;
    if (typeof parsed?.cachedAt !== 'string') return null;
    return {
      cachedAt: parsed.cachedAt,
      value: parser(parsed.value),
    };
  } catch {
    return null;
  }
}

export function saveSessionPageCache<T>(key: string, value: T, mode: CacheStorageMode = 'session') {
  try {
    const payload: SessionPageCacheEnvelope<T> = {
      cachedAt: new Date().toISOString(),
      value,
    };
    getStorage(mode).setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage write failures
  }
}

export function clearSessionPageCache(key: string, mode: CacheStorageMode = 'session') {
  try {
    getStorage(mode).removeItem(key);
  } catch {
    // ignore storage removal failures
  }
}

export function isSessionPageCacheFresh(cachedAt: string, maxAgeMs: number) {
  const ts = new Date(cachedAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= maxAgeMs;
}
