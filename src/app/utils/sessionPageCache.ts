export type SessionPageCacheEnvelope<T> = {
  cachedAt: string;
  value: T;
};

export function loadSessionPageCache<T>(
  key: string,
  parser: (raw: unknown) => T,
): SessionPageCacheEnvelope<T> | null {
  try {
    const raw = sessionStorage.getItem(key);
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

export function saveSessionPageCache<T>(key: string, value: T) {
  try {
    const payload: SessionPageCacheEnvelope<T> = {
      cachedAt: new Date().toISOString(),
      value,
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage write failures
  }
}

export function clearSessionPageCache(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore storage removal failures
  }
}

export function isSessionPageCacheFresh(cachedAt: string, maxAgeMs: number) {
  const ts = new Date(cachedAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= maxAgeMs;
}
