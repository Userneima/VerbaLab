import { captureServerError, supabaseAdmin } from "./platform.ts";

export const AI_USAGE_BLOCKED_ERROR = "当前 AI 使用量异常，已临时暂停，请稍后再试";

const REQUESTS_10M_LIMIT = Number(Deno.env.get("AI_USAGE_REQUESTS_10M_LIMIT") || 25);
const TOKENS_1H_LIMIT = Number(Deno.env.get("AI_USAGE_TOKENS_1H_LIMIT") || 50000);
const TOKENS_1D_LIMIT = Number(Deno.env.get("AI_USAGE_TOKENS_1D_LIMIT") || 150000);
const BLOCK_MINUTES = Number(Deno.env.get("AI_USAGE_BLOCK_MINUTES") || 30);

export type AiUsage = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
};

export type AiActor = {
  id: string;
  email: string | null;
};

export type UsagePolicyResult =
  | { ok: true }
  | { ok: false; message: string; retryAfterSec: number };

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60_000).toISOString();
}

function toInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
}

function getErrorCode(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || "unknown_error");
  return raw.slice(0, 160);
}

async function findInviteForUser(userId: string): Promise<{ id: string; code: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("invites")
    .select("id, code")
    .eq("used_by", userId)
    .order("used_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; code: string } | null;
}

async function getTokenSum(userId: string, sinceIso: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("ai_usage_events")
    .select("total_tokens")
    .eq("user_id", userId)
    .eq("success", true)
    .gte("created_at", sinceIso);
  if (error) throw error;
  return (data || []).reduce((sum, row: { total_tokens?: number | null }) => {
    const tokens = toInt(row.total_tokens);
    return sum + (tokens ?? 0);
  }, 0);
}

async function getRequestCount(userId: string, sinceIso: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);
  if (error) throw error;
  return count || 0;
}

async function getActiveBlock(userId: string): Promise<{ blocked_until: string; reason: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("ai_usage_blocks")
    .select("blocked_until, reason")
    .eq("user_id", userId)
    .is("cleared_at", null)
    .gt("blocked_until", new Date().toISOString())
    .order("blocked_until", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as { blocked_until: string; reason: string } | null;
}

async function createUsageBlock(input: {
  actor: AiActor;
  reason: string;
  metadata: Record<string, unknown>;
}): Promise<UsagePolicyResult> {
  const blockedUntil = new Date(Date.now() + BLOCK_MINUTES * 60_000).toISOString();
  await supabaseAdmin.from("ai_usage_blocks").insert({
    user_id: input.actor.id,
    blocked_until: blockedUntil,
    reason: input.reason,
  });
  await supabaseAdmin.from("admin_alerts").insert({
    severity: "critical",
    type: "ai_usage_spike",
    user_id: input.actor.id,
    user_email: input.actor.email,
    message: `账号 AI 使用量异常，已临时冻结 ${BLOCK_MINUTES} 分钟`,
    metadata: {
      reason: input.reason,
      ...input.metadata,
    },
  });
  return {
    ok: false,
    message: AI_USAGE_BLOCKED_ERROR,
    retryAfterSec: Math.max(1, Math.ceil((new Date(blockedUntil).getTime() - Date.now()) / 1000)),
  };
}

export async function assertAiUsageAllowed(actor: AiActor): Promise<UsagePolicyResult> {
  try {
    const activeBlock = await getActiveBlock(actor.id);
    if (activeBlock) {
      return {
        ok: false,
        message: AI_USAGE_BLOCKED_ERROR,
        retryAfterSec: Math.max(1, Math.ceil((new Date(activeBlock.blocked_until).getTime() - Date.now()) / 1000)),
      };
    }

    const [requests10m, tokens1h, tokens1d] = await Promise.all([
      getRequestCount(actor.id, isoMinutesAgo(10)),
      getTokenSum(actor.id, isoHoursAgo(1)),
      getTokenSum(actor.id, isoHoursAgo(24)),
    ]);

    if (requests10m >= REQUESTS_10M_LIMIT) {
      return createUsageBlock({
        actor,
        reason: "requests_10m_limit",
        metadata: { requests10m, limit: REQUESTS_10M_LIMIT },
      });
    }
    if (tokens1h >= TOKENS_1H_LIMIT) {
      return createUsageBlock({
        actor,
        reason: "tokens_1h_limit",
        metadata: { tokens1h, limit: TOKENS_1H_LIMIT },
      });
    }
    if (tokens1d >= TOKENS_1D_LIMIT) {
      return createUsageBlock({
        actor,
        reason: "tokens_1d_limit",
        metadata: { tokens1d, limit: TOKENS_1D_LIMIT },
      });
    }
  } catch (err) {
    console.log(`AI usage policy check skipped: ${err}`);
    await captureServerError("ai_usage_policy", err);
  }
  return { ok: true };
}

export async function recordAiUsageEvent(input: {
  actor: AiActor;
  feature: string;
  model: string | null;
  usage?: AiUsage | null;
  latencyMs: number;
  success: boolean;
  error?: unknown;
}) {
  try {
    const invite = await findInviteForUser(input.actor.id).catch(() => null);
    const { error } = await supabaseAdmin.from("ai_usage_events").insert({
      user_id: input.actor.id,
      user_email: input.actor.email,
      invite_id: invite?.id ?? null,
      invite_code: invite?.code ?? null,
      feature: input.feature,
      model: input.model,
      prompt_tokens: toInt(input.usage?.prompt_tokens),
      completion_tokens: toInt(input.usage?.completion_tokens),
      total_tokens: toInt(input.usage?.total_tokens),
      latency_ms: toInt(input.latencyMs),
      success: input.success,
      error_code: input.success ? null : getErrorCode(input.error),
    });
    if (error) throw error;
  } catch (err) {
    console.log(`Failed to record AI usage event: ${err}`);
    await captureServerError("ai_usage_record", err);
  }
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const blocked = /(sentence|prompt|input|answer|text|content|chinese|english|translation|diagnosis|suggestion)/i;
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (blocked.test(key)) continue;
    if (typeof raw === "string") out[key] = raw.slice(0, 80);
    else if (typeof raw === "number" || typeof raw === "boolean" || raw === null) out[key] = raw;
    else if (Array.isArray(raw)) out[key] = raw.slice(0, 12).map((item) =>
      typeof item === "string" ? item.slice(0, 60) : item
    );
  }
  return out;
}

export async function recordProductUsageEvent(input: {
  actor: AiActor;
  eventName: string;
  surface?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  metadata?: unknown;
}) {
  const eventName = input.eventName.trim().slice(0, 80);
  if (!eventName) return;
  try {
    const { error } = await supabaseAdmin.from("product_usage_events").insert({
      user_id: input.actor.id,
      event_name: eventName,
      surface: input.surface?.trim().slice(0, 60) || null,
      object_type: input.objectType?.trim().slice(0, 60) || null,
      object_id: input.objectId?.trim().slice(0, 120) || null,
      metadata: sanitizeMetadata(input.metadata),
    });
    if (error) throw error;
  } catch (err) {
    console.log(`Failed to record product usage event: ${err}`);
    await captureServerError("product_usage_record", err);
  }
}
