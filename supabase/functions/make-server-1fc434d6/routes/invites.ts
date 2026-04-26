import type { Hono } from "npm:hono";
import { requireAuthUser, supabaseAdmin } from "../platform.ts";

type InviteRow = {
  id: string;
  code: string;
  note: string | null;
  used_by: string | null;
  created_at: string;
  used_at: string | null;
};

type InviteNotePayload = {
  batchNote: string | null;
  assignedTo: string | null;
  assignedAt: string | null;
};

type InviteViewRow = {
  id: string;
  code: string;
  note: string | null;
  batch_note: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  used_by: string | null;
  used_by_email: string | null;
  created_at: string;
  used_at: string | null;
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_ADMIN_EMAILS = new Set(["wyc1186164839@gmail.com"]);

function normalizeEmail(email: string | null | undefined): string {
  return String(email || "").trim().toLowerCase();
}

function parseInviteNote(note: string | null | undefined): InviteNotePayload {
  const raw = String(note || "").trim();
  if (!raw) {
    return { batchNote: null, assignedTo: null, assignedAt: null };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const batchNote = String(parsed.batchNote || "").trim() || null;
    const assignedTo = String(parsed.assignedTo || "").trim() || null;
    const assignedAt = String(parsed.assignedAt || "").trim() || null;
    if (batchNote || assignedTo || assignedAt) {
      return { batchNote, assignedTo, assignedAt };
    }
  } catch {
    // legacy plain-text note
  }
  return { batchNote: raw, assignedTo: null, assignedAt: null };
}

function serializeInviteNote(payload: InviteNotePayload): string | null {
  const batchNote = String(payload.batchNote || "").trim() || null;
  const assignedTo = String(payload.assignedTo || "").trim() || null;
  const assignedAt = String(payload.assignedAt || "").trim() || null;

  if (!batchNote && !assignedTo) return null;
  if (!assignedTo && batchNote) return batchNote;

  return JSON.stringify({
    batchNote,
    assignedTo,
    assignedAt,
  });
}

function toInviteViewRow(row: InviteRow, usedByEmail?: string | null): InviteViewRow {
  const meta = parseInviteNote(row.note);
  return {
    ...row,
    batch_note: meta.batchNote,
    assigned_to: meta.assignedTo,
    assigned_at: meta.assignedAt,
    used_by_email: usedByEmail || null,
  };
}

async function attachUsedByEmails(rows: InviteRow[]): Promise<InviteViewRow[]> {
  const usedByIds = [...new Set(rows.map((row) => row.used_by).filter(Boolean))] as string[];
  const emailMap = new Map<string, string | null>();

  await Promise.all(
    usedByIds.map(async (userId) => {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (error) throw error;
        emailMap.set(userId, data.user?.email ?? null);
      } catch {
        emailMap.set(userId, null);
      }
    }),
  );

  return rows.map((row) => toInviteViewRow(row, row.used_by ? emailMap.get(row.used_by) ?? null : null));
}

async function loadInvitesByIds(inviteIds: string[]): Promise<InviteRow[]> {
  const { data, error } = await supabaseAdmin
    .from("invites")
    .select("id, code, note, used_by, created_at, used_at")
    .in("id", inviteIds);

  if (error) throw error;
  return (data || []) as InviteRow[];
}

async function requireInviteAdmin(c: any) {
  const auth = await requireAuthUser(c);
  if (!auth.ok) return auth;

  const email = normalizeEmail(auth.user.email);
  if (!INVITE_ADMIN_EMAILS.has(email)) {
    return {
      ok: false as const,
      response: c.json({ error: "Forbidden" }, 403),
    };
  }

  return auth;
}

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
      .select("id, code, note, used_by, created_at, used_at");

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
    const auth = await requireInviteAdmin(c);
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
        .select("id, code, note, used_by, created_at, used_at")
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

    const inviteRows = await attachUsedByEmails((invites || []) as InviteRow[]);
    const totalAssigned = inviteRows.filter((invite) => !invite.used_at && invite.assigned_to).length;
    const totalAvailable = inviteRows.filter((invite) => !invite.used_at && !invite.assigned_to).length;

    return c.json({
      invites: inviteRows,
      totalAvailable,
      totalAssigned,
      totalUnused: totalUnused || 0,
      totalUsed: totalUsed || 0,
    });
  });

  app.post("/make-server-1fc434d6/invites/generate", async (c) => {
    const auth = await requireInviteAdmin(c);
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
      invites: await attachUsedByEmails(invites),
      generatedCount: invites.length,
    });
  });

  app.post("/make-server-1fc434d6/invites/assignments", async (c) => {
    const auth = await requireInviteAdmin(c);
    if (!auth.ok) return auth.response;

    const { inviteIds: rawInviteIds, assignedTo: rawAssignedTo } = await c.req.json().catch(() => ({}));
    const inviteIds = Array.isArray(rawInviteIds)
      ? [...new Set(rawInviteIds.map((id) => String(id || "").trim()).filter(Boolean))]
      : [];
    const assignedTo = String(rawAssignedTo || "").trim().slice(0, 120);

    if (!inviteIds.length) {
      return c.json({ error: "inviteIds are required" }, 400);
    }
    if (!assignedTo) {
      return c.json({ error: "assignedTo is required" }, 400);
    }

    const existingInvites = await loadInvitesByIds(inviteIds);
    if (existingInvites.length !== inviteIds.length) {
      return c.json({ error: "Some invites were not found" }, 404);
    }

    const usedInvite = existingInvites.find((invite) => invite.used_at);
    if (usedInvite) {
      return c.json({ error: `Invite already used: ${usedInvite.code}` }, 400);
    }

    const assignedAt = new Date().toISOString();
    await Promise.all(
      existingInvites.map(async (invite) => {
        const { error } = await supabaseAdmin
          .from("invites")
          .update({
            note: serializeInviteNote({
              batchNote: parseInviteNote(invite.note).batchNote,
              assignedTo,
              assignedAt,
            }),
          })
          .eq("id", invite.id)
          .is("used_at", null);

        if (error) throw error;
      }),
    );

    const updatedInvites = await loadInvitesByIds(inviteIds);
    const updatedMap = new Map(updatedInvites.map((invite) => [invite.id, invite]));
    const orderedInvites = inviteIds
      .map((inviteId) => updatedMap.get(inviteId))
      .filter(Boolean) as InviteRow[];

    return c.json({
      invites: await attachUsedByEmails(orderedInvites),
    });
  });

  app.post("/make-server-1fc434d6/invites/:inviteId/assignment", async (c) => {
    const auth = await requireInviteAdmin(c);
    if (!auth.ok) return auth.response;

    const inviteId = String(c.req.param("inviteId") || "").trim();
    if (!inviteId) {
      return c.json({ error: "inviteId is required" }, 400);
    }

    const { assignedTo: rawAssignedTo } = await c.req.json().catch(() => ({}));
    const assignedTo = String(rawAssignedTo || "").trim().slice(0, 120) || null;

    const { data: existingInvite, error: existingError } = await supabaseAdmin
      .from("invites")
      .select("id, code, note, used_by, created_at, used_at")
      .eq("id", inviteId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existingInvite) {
      return c.json({ error: "Invite not found" }, 404);
    }
    if (existingInvite.used_at) {
      return c.json({ error: "Invite already used" }, 400);
    }

    const meta = parseInviteNote(existingInvite.note);
    const nextNote = serializeInviteNote({
      batchNote: meta.batchNote,
      assignedTo,
      assignedAt: assignedTo ? new Date().toISOString() : null,
    });

    const { data: updatedInvite, error: updateError } = await supabaseAdmin
      .from("invites")
      .update({ note: nextNote })
      .eq("id", inviteId)
      .select("id, code, note, used_by, created_at, used_at")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedInvite) {
      return c.json({ error: "Failed to update invite assignment" }, 500);
    }

    return c.json({
      invite: (await attachUsedByEmails([updatedInvite as InviteRow]))[0],
    });
  });
}
