import type { Hono } from "npm:hono";
import { buildQuotaSummary, grantQuota } from "../quota.ts";
import { requireAdminUser, requireAuthUser, supabaseAdmin } from "../platform.ts";

type AdminQuotaUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

async function listAdminQuotaUsers(query: string, limit: number): Promise<AdminQuotaUser[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const users: AdminQuotaUser[] = [];
  let page = 1;

  while (users.length < limit && page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const pageUsers = data.users || [];
    for (const user of pageUsers) {
      const email = user.email || null;
      const matches = !normalizedQuery
        || user.id.toLowerCase().includes(normalizedQuery)
        || String(email || "").toLowerCase().includes(normalizedQuery);
      if (!matches) continue;
      users.push({
        id: user.id,
        email,
        created_at: user.created_at || null,
        last_sign_in_at: user.last_sign_in_at || null,
      });
      if (users.length >= limit) break;
    }

    if (pageUsers.length < 100) break;
    page += 1;
  }

  return users;
}

export function registerQuotaRoutes(app: Hono) {
  const summaryHandler = async (c: any) => {
    const auth = await requireAuthUser(c);
    if (!auth.ok) return auth.response;
    return c.json({ summary: await buildQuotaSummary(auth.user.id) });
  };

  app.get("/make-server-1fc434d6/quota/summary", summaryHandler);
  app.get("/quota/summary", summaryHandler);

  app.get("/make-server-1fc434d6/admin/quota-users", async (c) => {
    const auth = await requireAdminUser(c);
    if (!auth.ok) return auth.response;

    const query = String(c.req.query("q") || "").trim();
    const limitRaw = Number(c.req.query("limit") || 25);
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.trunc(limitRaw))) : 25;
    const users = await listAdminQuotaUsers(query, limit);
    const rows = await Promise.all(users.map(async (user) => ({
      userId: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      summary: await buildQuotaSummary(user.id),
    })));

    return c.json({ rows });
  });

  app.post("/make-server-1fc434d6/admin/users/:userId/quota-grant", async (c) => {
    const auth = await requireAdminUser(c);
    if (!auth.ok) return auth.response;
    const userId = String(c.req.param("userId") || "").trim();
    if (!userId) return c.json({ error: "userId is required" }, 400);

    const body = await c.req.json().catch(() => ({}));
    const grantType = String(body.grantType || "pack");
    if (!["pack", "gift", "monthly", "yearly"].includes(grantType)) {
      return c.json({ error: "invalid grantType" }, 400);
    }

    const summary = await grantQuota({
      userId,
      adminUserId: auth.user.id,
      grantType: grantType as "pack" | "gift" | "monthly" | "yearly",
      amount: Number(body.amount || 0),
      monthlyLimit: Number(body.monthlyLimit || 0),
      expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
      note: typeof body.note === "string" ? body.note : "",
    });

    return c.json({ summary });
  });
}
