export const INVITE_ADMIN_EMAIL = 'wyc1186164839@gmail.com';

export function isInviteAdminEmail(email: string | null | undefined): boolean {
  return String(email || '').trim().toLowerCase() === INVITE_ADMIN_EMAIL;
}
