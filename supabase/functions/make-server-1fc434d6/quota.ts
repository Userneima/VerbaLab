import { requireAuthUser, supabaseAdmin } from "./platform.ts";

export type AiQuotaFeature = "expression_guide" | "expression_inspiration" | "vocab_card";
export type AiQuotaPlanType = "free" | "monthly" | "yearly";

type Actor = { id: string; email: string | null };

type QuotaAccountRow = {
  user_id: string;
  daily_date: string;
  daily_free_limit: number;
  daily_free_used: number;
  gift_remaining: number;
  pack_remaining: number;
  plan_type: AiQuotaPlanType;
  plan_monthly_limit: number;
  plan_monthly_used: number;
  plan_period: string;
  plan_expires_at: string | null;
  updated_at: string;
};

type QuotaEventRow = {
  id: string;
  label: string;
  delta: number;
  created_at: string;
};

export const AI_QUOTA_COST: Record<AiQuotaFeature, number> = {
  expression_guide: 1,
  expression_inspiration: 1,
  vocab_card: 3,
};

const DAILY_FREE_LIMIT = 0;
const NEW_USER_GIFT = 100;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

function planLabel(type: AiQuotaPlanType) {
  if (type === "monthly") return "月卡 Pro";
  if (type === "yearly") return "年卡 Pro";
  return "免费版";
}

function featureLabel(feature: AiQuotaFeature) {
  if (feature === "expression_guide") return "表达指导";
  if (feature === "expression_inspiration") return "不知道说什么";
  return "词卡生成";
}

export function isWeappClient(c: any): boolean {
  return String(c.req.header("x-verbalab-client") || "").toLowerCase() === "weapp";
}

async function insertDefaultAccount(userId: string): Promise<QuotaAccountRow> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("ai_quota_accounts")
    .upsert({
      user_id: userId,
      daily_date: todayKey(),
      daily_free_limit: DAILY_FREE_LIMIT,
      daily_free_used: 0,
      gift_remaining: NEW_USER_GIFT,
      pack_remaining: 0,
      plan_type: "free",
      plan_monthly_limit: 0,
      plan_monthly_used: 0,
      plan_period: monthKey(),
      plan_expires_at: null,
      updated_at: now,
    }, { onConflict: "user_id", ignoreDuplicates: true })
    .select("*")
    .single();

  if (error) {
    const { data: existing, error: loadError } = await supabaseAdmin
      .from("ai_quota_accounts")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (loadError) throw loadError;
    return existing as QuotaAccountRow;
  }
  return data as QuotaAccountRow;
}

async function updateAccount(row: QuotaAccountRow): Promise<QuotaAccountRow> {
  const { data, error } = await supabaseAdmin
    .from("ai_quota_accounts")
    .update({
      daily_date: row.daily_date,
      daily_free_limit: row.daily_free_limit,
      daily_free_used: row.daily_free_used,
      gift_remaining: row.gift_remaining,
      pack_remaining: row.pack_remaining,
      plan_type: row.plan_type,
      plan_monthly_limit: row.plan_monthly_limit,
      plan_monthly_used: row.plan_monthly_used,
      plan_period: row.plan_period,
      plan_expires_at: row.plan_expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", row.user_id)
    .select("*")
    .single();
  if (error) throw error;
  return data as QuotaAccountRow;
}

async function normalizeAccount(row: QuotaAccountRow): Promise<QuotaAccountRow> {
  let next = { ...row };
  let changed = false;
  const today = todayKey();
  const month = monthKey();

  if (next.daily_date !== today) {
    next.daily_date = today;
    next.daily_free_limit = DAILY_FREE_LIMIT;
    next.daily_free_used = 0;
    changed = true;
  }

  if (next.plan_period !== month) {
    next.plan_period = month;
    next.plan_monthly_used = 0;
    changed = true;
  }

  if (next.plan_expires_at && new Date(next.plan_expires_at).getTime() <= Date.now()) {
    next.plan_type = "free";
    next.plan_monthly_limit = 0;
    next.plan_monthly_used = 0;
    next.plan_expires_at = null;
    changed = true;
  }

  if (next.daily_free_limit !== DAILY_FREE_LIMIT) {
    next.daily_free_limit = DAILY_FREE_LIMIT;
    changed = true;
  }

  return changed ? updateAccount(next) : next;
}

export async function getQuotaAccount(userId: string): Promise<QuotaAccountRow> {
  const { data, error } = await supabaseAdmin
    .from("ai_quota_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return normalizeAccount(data ? data as QuotaAccountRow : await insertDefaultAccount(userId));
}

async function loadQuotaEvents(userId: string): Promise<QuotaEventRow[]> {
  const { data, error } = await supabaseAdmin
    .from("ai_quota_events")
    .select("id, label, delta, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []) as QuotaEventRow[];
}

export async function buildQuotaSummary(userId: string) {
  const [row, events] = await Promise.all([getQuotaAccount(userId), loadQuotaEvents(userId)]);
  const todayFreeRemaining = 0;
  const planMonthlyRemaining = Math.max(0, row.plan_monthly_limit - row.plan_monthly_used);
  const extraRemaining = Math.max(0, row.gift_remaining + row.pack_remaining);
  return {
    todayFreeLimit: row.daily_free_limit,
    todayFreeRemaining,
    giftRemaining: row.gift_remaining,
    packRemaining: row.pack_remaining,
    extraRemaining,
    planType: row.plan_type,
    planLabel: planLabel(row.plan_type),
    planMonthlyLimit: row.plan_monthly_limit,
    planMonthlyRemaining,
    planExpiresAt: row.plan_expires_at || undefined,
    totalRemaining: planMonthlyRemaining + extraRemaining,
    ledger: events.map((event) => ({
      id: event.id,
      label: event.label,
      delta: event.delta,
      createdAt: event.created_at,
    })),
  };
}

async function recordQuotaEvent(input: {
  userId: string;
  feature?: string;
  label: string;
  delta: number;
  source: string;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("ai_quota_events").insert({
    user_id: input.userId,
    feature: input.feature || null,
    label: input.label,
    delta: input.delta,
    source: input.source,
    created_by: input.createdBy || null,
    metadata: input.metadata || {},
  });
  if (error) throw error;
}

function getQuotaSource(c: any): "weapp" | "web" {
  return isWeappClient(c) ? "weapp" : "web";
}

export async function consumeQuota(actor: Actor, feature: AiQuotaFeature, source = "system") {
  const cost = AI_QUOTA_COST[feature];
  let row = await getQuotaAccount(actor.id);
  let remaining = cost;

  const planRemaining = Math.max(0, row.plan_monthly_limit - row.plan_monthly_used);
  const planUsed = Math.min(planRemaining, remaining);
  row.plan_monthly_used += planUsed;
  remaining -= planUsed;

  const packUsed = Math.min(Math.max(0, row.pack_remaining), remaining);
  row.pack_remaining -= packUsed;
  remaining -= packUsed;

  const giftUsed = Math.min(Math.max(0, row.gift_remaining), remaining);
  row.gift_remaining -= giftUsed;
  remaining -= giftUsed;

  if (remaining > 0) {
    return {
      ok: false as const,
      error: "AI 生成次数已用完",
      code: "AI_QUOTA_EXHAUSTED",
      cost,
      summary: await buildQuotaSummary(actor.id),
    };
  }

  await updateAccount(row);
  await recordQuotaEvent({
    userId: actor.id,
    feature,
    label: featureLabel(feature),
    delta: -cost,
    source,
    metadata: { cost },
  });

  return { ok: true as const, summary: await buildQuotaSummary(actor.id) };
}

export async function consumeQuotaForClient(c: any, feature: AiQuotaFeature) {
  const auth = await requireAuthUser(c);
  if (!auth.ok) return { ok: false as const, response: auth.response };
  const result = await consumeQuota(auth.user, feature, getQuotaSource(c));
  if (result.ok) return result;
  return {
    ok: false as const,
    response: c.json(
      {
        error: result.error,
        code: result.code,
        cost: result.cost,
        summary: result.summary,
      },
      402,
    ),
  };
}

export async function ensureQuotaForClient(c: any, feature: AiQuotaFeature) {
  const auth = await requireAuthUser(c);
  if (!auth.ok) return { ok: false as const, response: auth.response };
  const cost = AI_QUOTA_COST[feature];
  const summary = await buildQuotaSummary(auth.user.id);
  if (summary.totalRemaining >= cost) return { ok: true as const };
  return {
    ok: false as const,
    response: c.json(
      {
        error: "AI 生成次数已用完",
        code: "AI_QUOTA_EXHAUSTED",
        cost,
        summary,
      },
      402,
    ),
  };
}

export const consumeQuotaForWeapp = consumeQuotaForClient;
export const ensureQuotaForWeapp = ensureQuotaForClient;

export async function grantQuota(input: {
  userId: string;
  adminUserId: string;
  grantType: "pack" | "gift" | "monthly" | "yearly";
  amount?: number;
  monthlyLimit?: number;
  expiresAt?: string | null;
  note?: string;
}) {
  let row = await getQuotaAccount(input.userId);
  const amount = Math.max(0, Math.trunc(Number(input.amount || 0)));
  const monthlyLimit = Math.max(0, Math.trunc(Number(input.monthlyLimit || 0)));
  let delta = 0;
  let label = "管理员调整";

  if (input.grantType === "pack") {
    const add = amount || 100;
    row.pack_remaining += add;
    delta = add;
    label = `管理员加次包 ${add} 次`;
  } else if (input.grantType === "gift") {
    const add = amount || 100;
    row.gift_remaining += add;
    delta = add;
    label = `管理员赠送 ${add} 次`;
  } else if (input.grantType === "monthly") {
    const limit = monthlyLimit || 800;
    row.plan_type = "monthly";
    row.plan_monthly_limit = limit;
    row.plan_monthly_used = 0;
    row.plan_period = monthKey();
    row.plan_expires_at = input.expiresAt || addDays(30);
    delta = limit;
    label = `管理员开通月卡 ${limit} 次/月`;
  } else {
    const limit = monthlyLimit || 800;
    row.plan_type = "yearly";
    row.plan_monthly_limit = limit;
    row.plan_monthly_used = 0;
    row.plan_period = monthKey();
    row.plan_expires_at = input.expiresAt || addDays(365);
    delta = limit;
    label = `管理员开通年卡 ${limit} 次/月`;
  }

  await updateAccount(row);
  await recordQuotaEvent({
    userId: input.userId,
    label,
    delta,
    source: "admin",
    createdBy: input.adminUserId,
    metadata: { grantType: input.grantType, note: input.note || null },
  });
  return buildQuotaSummary(input.userId);
}
