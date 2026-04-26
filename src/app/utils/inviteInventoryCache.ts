import type { InviteItem } from './api';

const STORAGE_KEY = 'ff_invite_inventory_cache_v1';

export type InviteInventoryCache = {
  invites: InviteItem[];
  totalAvailable: number;
  totalAssigned: number;
  totalUsed: number;
  cachedAt: string;
};

export function loadInviteInventoryCache(): InviteInventoryCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InviteInventoryCache;
    if (!Array.isArray(parsed.invites)) return null;
    if (typeof parsed.totalAvailable !== 'number') return null;
    if (typeof parsed.totalAssigned !== 'number') return null;
    if (typeof parsed.totalUsed !== 'number') return null;
    if (typeof parsed.cachedAt !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveInviteInventoryCache(value: InviteInventoryCache) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage write failures
  }
}

export function clearInviteInventoryCache() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage removal failures
  }
}
