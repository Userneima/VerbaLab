import { z } from 'zod';
import { getAiJson, postAiJson } from './client';

const adminOverviewSchema = z.object({
  summary: z.object({
    tokensToday: z.number().default(0),
    tokens7d: z.number().default(0),
    requests7d: z.number().default(0),
    activeUsers7d: z.number().default(0),
    openAlerts: z.number().default(0),
    activeBlocks: z.number().default(0),
  }),
  tokenByFeature: z.array(z.object({
    feature: z.string(),
    requests: z.number().default(0),
    tokens: z.number().default(0),
  })).default([]),
  productEvents: z.array(z.object({
    eventName: z.string(),
    count: z.number().default(0),
  })).default([]),
});

const adminInviteUsageRowSchema = z.object({
  inviteId: z.string(),
  code: z.string(),
  assignedTo: z.string().nullable().optional(),
  assignedAt: z.string().nullable().optional(),
  usedAt: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
  tokensToday: z.number().default(0),
  tokens7d: z.number().default(0),
  requests7d: z.number().default(0),
  topFeature: z.string().nullable().optional(),
  lastUsedAt: z.string().nullable().optional(),
  blockedUntil: z.string().nullable().optional(),
  blockReason: z.string().nullable().optional(),
});

const adminInviteUsageSchema = z.object({
  rows: z.array(adminInviteUsageRowSchema).default([]),
});

const adminAlertSchema = z.object({
  id: z.string(),
  severity: z.string(),
  type: z.string(),
  user_id: z.string().nullable().optional(),
  user_email: z.string().nullable().optional(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  status: z.string(),
  created_at: z.string(),
  resolved_at: z.string().nullable().optional(),
});

const adminAlertsSchema = z.object({
  alerts: z.array(adminAlertSchema).default([]),
});

export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminInviteUsageRow = z.infer<typeof adminInviteUsageRowSchema>;
export type AdminAlert = z.infer<typeof adminAlertSchema>;
export type AdminInviteUsageResult = z.infer<typeof adminInviteUsageSchema>;
export type AdminAlertsResult = z.infer<typeof adminAlertsSchema>;

export async function getAdminOverview(): Promise<AdminOverview> {
  return adminOverviewSchema.parse(await getAiJson('/admin/overview'));
}

export async function getAdminInviteUsage(): Promise<AdminInviteUsageResult> {
  return adminInviteUsageSchema.parse(await getAiJson('/admin/invite-usage'));
}

export async function getAdminAlerts(): Promise<AdminAlertsResult> {
  return adminAlertsSchema.parse(await getAiJson('/admin/alerts'));
}

export async function resolveAdminAlert(alertId: string): Promise<void> {
  await postAiJson(`/admin/alerts/${encodeURIComponent(alertId)}/resolve`, {});
}

export async function unblockAdminUser(userId: string): Promise<void> {
  await postAiJson(`/admin/users/${encodeURIComponent(userId)}/unblock`, {});
}

export function trackProductEvent(payload: {
  eventName: string;
  surface?: string;
  objectType?: string;
  objectId?: string;
  metadata?: Record<string, unknown>;
}) {
  void postAiJson('/analytics/events', payload).catch(() => {
    // Analytics must never block local-first learning flows.
  });
}
