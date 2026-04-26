import { describe, expect, it } from 'vitest';
import { INVITE_ADMIN_EMAIL, isInviteAdminEmail } from './inviteAdmin';

describe('invite admin access', () => {
  it('only allows the configured admin email', () => {
    expect(isInviteAdminEmail(INVITE_ADMIN_EMAIL)).toBe(true);
    expect(isInviteAdminEmail('WYC1186164839@gmail.com')).toBe(true);
    expect(isInviteAdminEmail('other@example.com')).toBe(false);
    expect(isInviteAdminEmail('')).toBe(false);
  });
});
