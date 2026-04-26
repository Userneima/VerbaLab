import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearInviteInventoryCache,
  loadInviteInventoryCache,
  saveInviteInventoryCache,
  type InviteInventoryCache,
} from './inviteInventoryCache';

const makeCache = (): InviteInventoryCache => ({
  invites: [
    {
      id: '1',
      code: 'VERBA-ABCD-EFGH-JKLM',
      created_at: '2026-04-26T00:00:00.000Z',
      used_at: null,
      assigned_to: 'Alice',
      assigned_at: '2026-04-26T01:00:00.000Z',
      used_by: null,
      used_by_email: null,
      batch_note: null,
      note: null,
    },
  ],
  totalAvailable: 3,
  totalAssigned: 1,
  totalUsed: 2,
  cachedAt: '2026-04-26T02:00:00.000Z',
});

describe('invite inventory cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips cached inventory', () => {
    const cache = makeCache();
    saveInviteInventoryCache(cache);
    expect(loadInviteInventoryCache()).toEqual(cache);
  });

  it('ignores malformed cache payloads', () => {
    localStorage.setItem('ff_invite_inventory_cache_v1', JSON.stringify({ invites: [] }));
    expect(loadInviteInventoryCache()).toBeNull();
  });

  it('clears cached inventory', () => {
    saveInviteInventoryCache(makeCache());
    clearInviteInventoryCache();
    expect(loadInviteInventoryCache()).toBeNull();
  });
});
