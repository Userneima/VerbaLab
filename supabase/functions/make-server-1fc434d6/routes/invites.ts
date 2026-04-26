import type { Hono } from "npm:hono";
import { requireAuth, supabaseAdmin } from "../platform.ts";

type InviteRow = {
  id: string;
  code: string;
  note: string | null;
  created_at: string;
  used_at: string | null;
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBlock(length = 4): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const byte of bytes) {
    out += CODE_CHARS[byte % CODE_CHARS.length];
  }
  return out;
}

function makeInviteCode(): string {
  return `VERBA-${randomBlock()}-${randomBlock()}-${randomBlock()}`;
}

async function generateUnusedCodes(count: number): Promise<string[]> {
  let attempts = 0;
  const accepted = new Set<string>();

  while (accepted.size < count && attempts < 5) {
    attempts += 1;
    const batch = new Set<string>();
    while (batch.size < Math.max(count * 3, 12)) {
      batch.add(makeInviteCode());
    }

    const candidates = [...batch].filter((code) => !accepted.has(code));
    const { data, error } = await supabaseAdmin
      .from("invites")
      .select("code")
      .in("code", candidates);

    if (error) throw error;

    const existing = new Set((data || []).map((row: { code: string }) => String(row.code || "")));
    for (const code of candidates) {
      if (!existing.has(code)) {
        accepted.add(code);
        if (accepted.size >= count) break;
      }
    }
  }

  if (accepted.size < count) {
    throw new Error("Failed to generate unique invite codes");
  }

  return [...accepted].slice(0, count);
}

async function insertInviteBatch(count: number, note: string | null): Promise<InviteRow[]> {
  let attempts = 0;
  while (attempts < 3) {
    attempts += 1;
    const codes = await generateUnusedCodes(count);
    const rows = codes.map((code) => ({ code, note }));
    const { data, error } = await supabaseAdmin
      .from("invites")
      .insert(rows)
      .select("id, code, note, created_at, used_at");

    if (!error) {
      return (data || []) as InviteRow[];
    }

    if (!/duplicate key value|unique/i.test(String(error.message || ""))) {
      throw error;
    }
  }

  throw new Error("Failed to insert invite batch");
}

export function registerInviteRoutes(app: Hono) {
  app.get("/make-server-1fc434d6/invites", async (c) => {
    const auth = await requireAuth(c);
    if (!auth.ok) return auth.response;

    const limitParam = Number(c.req.query("limit") || 40);
    const limit = Number.isFinite(limitParam)
      ? Math.min(100, Math.max(1, Math.trunc(limitParam)))
      : 40;

    const [{ data: invites, error: invitesError }, { count: totalUnused, error: unusedError }, {
      count: totalUsed,
      error: usedError,
    }] = await Promise.all([
      supabaseAdmin
        .from("invites")
        .select("id, code, note, created_at, used_at")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from("invites")
        .select("id", { count: "exact", head: true })
        .is("used_at", null),
      supabaseAdmin
        .from("invites")
        .select("id", { count: "exact", head: true })
        .not("used_at", "is", null),
    ]);

    if (invitesError) throw invitesError;
    if (unusedError) throw unusedError;
    if (usedError) throw usedError;

    return c.json({
      invites: (invites || []) as InviteRow[],
      totalUnused: totalUnused || 0,
      totalUsed: totalUsed || 0,
    });
  });

  app.post("/make-server-1fc434d6/invites/generate", async (c) => {
    const auth = await requireAuth(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json().catch(() => ({}));
    const countRaw = Number(body?.count ?? 5);
    const count = Number.isFinite(countRaw)
      ? Math.min(20, Math.max(1, Math.trunc(countRaw)))
      : 5;
    const noteValue = String(body?.note ?? "").trim();
    const note = noteValue ? noteValue.slice(0, 120) : null;

    const invites = await insertInviteBatch(count, note);

    return c.json({
      invites,
      generatedCount: invites.length,
    });
  });
}
