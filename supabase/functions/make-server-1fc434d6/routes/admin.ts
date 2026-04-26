import type { Hono } from "npm:hono";
import { requireAdminUser, supabaseAdmin } from "../platform.ts";
import { recordProductUsageEvent } from "../observability.ts";
import { requireAuthUser } from "../platform.ts";

type UsageRow = {
  user_id: string;
  user_email: string | null;
  invite_id: string | null;
  invite_code: string | null;
  feature: string;
  total_tokens: number | null;
  success: boolean;
  created_at: string;
};

type InviteRow = {
  id: string;
  code: string;
  note: string | null;
  used_by: string | null;
  created_at: string;
  used_at: string | null;
};

function sinceDays(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}

function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function sumTokens(rows: UsageRow[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.total_tokens) || 0), 0);
}

function parseInviteNote(note: string | null | undefined): { assignedTo: string | null; assignedAt: string | null } {
  const raw = String(note || "").trim();
  if (!raw) return { assignedTo: null, assignedAt: null };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      assignedTo: String(parsed.assignedTo || "").trim() || null,
      assignedAt: String(parsed.assignedAt || "").trim() || null,
    };
  } catch {
    return { assignedTo: null, assignedAt: null };
  }
}

function topFeature(rows: UsageRow[]): string | null {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.feature, (totals.get(row.feature) || 0) + (Number(row.total_tokens) || 0));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

async function getUserEmailMap(userIds: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  await Promise.all(
    [...new Set(userIds.filter(Boolean))].map(async (userId) => {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (error) throw error;
        map.set(userId, data.user?.email ?? null);
      } catch {
        map.set(userId, null);
      }
    }),
  );
  return map;
}

async function loadUsageRows(sinceIso: string, userId?: string): Promise<UsageRow[]> {
  let query = supabaseAdmin
    .from("ai_usage_events")
    .select("user_id, user_email, invite_id, invite_code, feature, total_tokens, success, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as UsageRow[];
}

async function loadActiveBlocks(userIds?: string[]) {
  let query = supabaseAdmin
    .from("ai_usage_blocks")
    .select("id, user_id, blocked_until, reason, created_at, cleared_at")
    .is("cleared_at", null)
    .gt("blocked_until", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (userIds?.length) query = query.in("user_id", [...new Set(userIds)]);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export function registerAdminRoutes(app: Hono) {
  app.post("/make-server-1fc434d6/analytics/events", async (c) => {
    const auth = await requireAuthUser(c);
    if (!auth.ok) return auth.response;
    const body = await c.req.json().catch(() => ({}));
    await recordProductUsageEvent({
      actor: auth.user,
      eventName: String(body.eventName || ""),
      surface: typeof body.surface === "string" ? body.surface : null,
      objectType: typeof body.objectType === "string" ? body.objectType : null,
      objectId: typeof body.objectId === "string" ? body.objectId : null,
      metadata: body.metadata,
    });
    return c.json({ ok: true });
  });

  app.get("/make-server-1fc434d6/admin/overview", async (c) => {
    const auth = await requireAdminUser(c);
    if (!auth.ok) return auth.response;

    const [usage7d, product7d, openAlerts, activeBlocks] = await Promise.all([
      loadUsageRows(sinceDays(7)),
      supabaseAdmin
        .from("product_usage_events")
        .select("event_name, surface, created_at")
        .gte("created_at", sinceDays(7))
        .order("created_at", { ascending: false })
        .limit(5000),
      supabaseAdmin
        .from("admin_alerts")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      loadActiveBlocks(),
    ]);

    const todayIso = todayStartIso();
    const usageToday = usage7d.filter((row) => row.created_at >= todayIso);
    const activeUsers7d = new Set(usage7d.map((row) => row.user_id)).size;
    const featureTotals = new Map<string, { requests: number; tokens: number }>();
    for (const row of usage7d) {
      const current = featureTotals.get(row.feature) || { requests: 0, tokens: 0 };
      current.requests += 1;
      current.tokens += Number(row.total_tokens) || 0;
      featureTotals.set(row.feature, current);
    }

    const productRows = product7d.data || [];
    const productEvents = new Map<string, number>();
    for (const row of productRows as Array<{ event_name: string }>) {
      productEvents.set(row.event_name, (productEvents.get(row.event_name) || 0) + 1);
    }

    return c.json({
      summary: {
        tokensToday: sumTokens(usageToday),
        tokens7d: sumTokens(usage7d),
        requests7d: usage7d.length,
        activeUsers7d,
        openAlerts: openAlerts.count || 0,
        activeBlocks: activeBlocks.length,
      },
      tokenByFeature: [...featureTotals.entries()]
        .map(([feature, value]) => ({ feature, ...value }))
        .sort((a, b) => b.tokens - a.tokens),
      productEvents: [...productEvents.entries()]
        .map(([eventName, count]) => ({ eventName, count }))
        .sort((a, b) => b.count - a.count),
    });
  });

  app.get("/make-server-1fc434d6/admin/invite-usage", async (c) => {
    const auth = await requireAdminUser(c);
    if (!auth.ok) return auth.response;

    const [{ data: invites, error }, usage7d] = await Promise.all([
      supabaseAdmin
        .from("invites")
        .select("id, code, note, used_by, created_at, used_at")
        .order("created_at", { ascending: false })
        .limit(200),
      loadUsageRows(sinceDays(7)),
    ]);
    if (error) throw error;

    const inviteRows = (invites || []) as InviteRow[];
    const userIds = inviteRows.map((invite) => invite.used_by).filter(Boolean) as string[];
    const [emailMap, blocks] = await Promise.all([getUserEmailMap(userIds), loadActiveBlocks(userIds)]);
    const blockMap = new Map(blocks.map((block: any) => [block.user_id, block]));
    const todayIso = todayStartIso();

    const rows = inviteRows.map((invite) => {
      const userRows = usage7d.filter((row) => row.user_id === invite.used_by);
      const todayRows = userRows.filter((row) => row.created_at >= todayIso);
      const note = parseInviteNote(invite.note);
      const block = invite.used_by ? blockMap.get(invite.used_by) : null;
      return {
        inviteId: invite.id,
        code: invite.code,
        assignedTo: note.assignedTo,
        assignedAt: note.assignedAt,
        usedAt: invite.used_at,
        userId: invite.used_by,
        userEmail: invite.used_by ? emailMap.get(invite.used_by) ?? null : null,
        tokensToday: sumTokens(todayRows),
        tokens7d: sumTokens(userRows),
        requests7d: userRows.length,
        topFeature: topFeature(userRows),
        lastUsedAt: userRows[0]?.created_at ?? null,
        blockedUntil: block?.blocked_until ?? null,
        blockReason: block?.reason ?? null,
      };
    });

    return c.json({ rows });
  });

  app.get("/make-server-1fc434d6/admin/user-usage", async (c) => {
    const auth = await requireAdminUser(c);
    if (!auth.ok) return auth.response;
    const userId = String(c.req.query("userId") || "").trim();
    const daysRaw = Number(c.req.query("days") || 7);
    const days = Number.isFinite(daysRaw) ? Math.min(30, Math.max(1, Math.trunc(daysRaw))) : 7;
    if (!userId) return c.json({ error: "userId is required" }, 400);
    const rows = await loadUsageRows(sinceDays(days), userId);
    return c.json({
      userId,
      days,
      totalTokens: sumTokens(rows),
      requests: rows.length,
      rows: rows.slice(0, 200),
    });
  });

  app.get("/make-server-1fc434d6/admin/alerts", async (c) => {
    const auth = await requireAdminUser(c);
    if (!auth.ok) return auth.response;
    const { data, error } = await supabaseAdmin
      .from("admin_alerts")
      .select("id, severity, type, user_id, user_email, message, metadata, status, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return c.json({ alerts: data || [] });
  });

  app.post("/make-server-1fc434d6/admin/alerts/:id/resolve", async (c) => {
    const auth = await requireAdminUser(c);
    if (!auth.ok) return auth.response;
    const id = String(c.req.param("id") || "").trim();
    if (!id) return c.json({ error: "id is required" }, 400);
    const { error } = await supabaseAdmin
      .from("admin_alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return c.json({ ok: true });
  });

  app.post("/make-server-1fc434d6/admin/users/:userId/unblock", async (c) => {
    const auth = await requireAdminUser(c);
    if (!auth.ok) return auth.response;
    const userId = String(c.req.param("userId") || "").trim();
    if (!userId) return c.json({ error: "userId is required" }, 400);
    const { error } = await supabaseAdmin
      .from("ai_usage_blocks")
      .update({ cleared_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("cleared_at", null);
    if (error) throw error;
    return c.json({ ok: true });
  });
}
