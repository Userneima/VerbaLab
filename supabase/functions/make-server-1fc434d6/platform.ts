import type { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import { createClient } from "npm:@supabase/supabase-js";

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type AllowedOriginsConfig = {
  exact: Set<string>;
  wildcardSuffixes: string[];
};

export const INVITE_INVALID_ERROR = "邀请码无效或已使用";
export const ADMIN_EMAILS = new Set(["wyc1186164839@gmail.com"]);

export function getClientIp(c: any): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = c.req.header("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const now = Date.now();
  const rlKey = `rl:${key}`;
  const bucket = await kv.get(rlKey) as { count?: number; resetAt?: number } | undefined;
  if (!bucket || bucket.resetAt <= now) {
    await kv.set(rlKey, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if ((bucket.count || 0) >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  await kv.set(rlKey, { count: (bucket.count || 0) + 1, resetAt: bucket.resetAt });
  return { ok: true };
}

function getAllowedOrigins(): AllowedOriginsConfig {
  const raw = Deno.env.get("CORS_ALLOW_ORIGINS") || "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    return {
      exact: new Set([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ]),
      wildcardSuffixes: [],
    };
  }
  const exact = new Set<string>();
  const wildcardSuffixes: string[] = [];
  for (const item of list) {
    if (item.includes("*.")) {
      try {
        const url = new URL(item);
        const wildcardHost = url.hostname.replace("*.", "");
        if (wildcardHost) wildcardSuffixes.push(`${url.protocol}//${wildcardHost}`);
      } catch {
        // ignore invalid wildcard origins
      }
      continue;
    }
    exact.add(item);
  }
  return { exact, wildcardSuffixes };
}

const ALLOWED_ORIGINS = getAllowedOrigins();

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return false;
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isWildcardAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const originBase = `${url.protocol}//${url.hostname}`;
    return ALLOWED_ORIGINS.wildcardSuffixes.some((allowedBase) =>
      originBase === allowedBase || originBase.endsWith(`.${allowedBase.split("://")[1]}`)
        ? allowedBase.startsWith(`${url.protocol}//`)
        : false
    );
  } catch {
    return false;
  }
}

export async function captureServerError(scope: string, err: unknown) {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.split("/").filter(Boolean).pop();
    if (!projectId || !url.username) return;
    const endpoint = `${url.protocol}//${url.host}/api/${projectId}/store/`;
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${url.username}`,
      },
      body: JSON.stringify({
        message: `${scope}: ${String(err)}`,
        level: "error",
        platform: "javascript",
        logger: "edge-function",
      }),
    });
  } catch {
    // noop
  }
}

export async function getUserId(c: any): Promise<string | null> {
  const user = await getAuthenticatedUser(c);
  return user?.id || null;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `wmp_${body}`;
}

async function getWechatSessionUser(
  token: string,
): Promise<{ id: string; email: string | null } | null> {
  if (!token.startsWith("wmp_")) return null;
  const tokenHash = await sha256Hex(token);
  const { data, error } = await supabaseAdmin
    .from("wechat_sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data?.user_id) return null;

  await supabaseAdmin
    .from("wechat_sessions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
  if (userError || !userData.user?.id) return null;
  return {
    id: userData.user.id,
    email: typeof userData.user.email === "string" ? userData.user.email : null,
  };
}

export async function createWechatSession(userId: string): Promise<{ token: string; expiresAt: string }> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
  const { error } = await supabaseAdmin.from("wechat_sessions").insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    last_used_at: new Date().toISOString(),
  });
  if (error) throw error;
  return { token, expiresAt };
}

export async function revokeWechatSessions(userId: string): Promise<void> {
  await supabaseAdmin
    .from("wechat_sessions")
    .delete()
    .eq("user_id", userId);
}

export async function getSupabaseJwtUser(c: any): Promise<{ id: string; email: string | null } | null> {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  if (!accessToken) return null;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user?.id) return null;
    return {
      id: user.id,
      email: typeof user.email === "string" ? user.email : null,
    };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(
  c: any,
): Promise<{ id: string; email: string | null } | null> {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  if (!accessToken) return null;
  const supabaseUser = await getSupabaseJwtUser(c);
  if (supabaseUser) return supabaseUser;
  return getWechatSessionUser(accessToken);
}

export async function requireAuth(
  c: any,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const userId = await getUserId(c);
  if (!userId) {
    return {
      ok: false,
      response: c.json({ error: "Unauthorized - valid auth token required" }, 401),
    };
  }
  return { ok: true, userId };
}

export async function requireAuthUser(
  c: any,
): Promise<{ ok: true; user: { id: string; email: string | null } } | { ok: false; response: Response }> {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return {
      ok: false,
      response: c.json({ error: "Unauthorized - valid auth token required" }, 401),
    };
  }
  return { ok: true, user };
}

function normalizeEmail(email: string | null | undefined): string {
  return String(email || "").trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.has(normalizeEmail(email));
}

export async function requireAdminUser(
  c: any,
): Promise<{ ok: true; user: { id: string; email: string | null } } | { ok: false; response: Response }> {
  const auth = await requireAuthUser(c);
  if (!auth.ok) return auth;
  if (!isAdminEmail(auth.user.email)) {
    return {
      ok: false,
      response: c.json({ error: "Forbidden" }, 403),
    };
  }
  return auth;
}

export function normalizeInviteCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

export async function findAvailableInvite(code: string): Promise<{ id: string; code: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("invites")
    .select("id, code")
    .eq("code", code)
    .is("used_at", null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function consumeInvite(inviteId: string, userId: string): Promise<boolean> {
  const usedAt = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("invites")
    .update({ used_at: usedAt, used_by: userId })
    .eq("id", inviteId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return !!data?.id;
}

export async function cleanupCreatedSignupUser(userId: string, email: string, reason: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error(
      `Failed to clean up signup user ${userId} (${email}) after ${reason}: ${error.message}`,
    );
    await captureServerError(`signup_cleanup:${reason}`, error);
    throw error;
  }
}

export function applyPlatformMiddleware(app: Hono) {
  app.use("*", logger(console.log));

  app.use(
    "/*",
    cors({
      origin: (origin) => {
        if (!origin) return "";
        if (ALLOWED_ORIGINS.exact.has(origin)) return origin;
        if (isWildcardAllowedOrigin(origin)) return origin;
        if (isLocalhostOrigin(origin)) return origin;
        return "";
      },
      allowHeaders: ["Content-Type", "Authorization", "apikey", "X-VerbaLab-Client"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
    }),
  );

  const applyAiGuard = async (c: any, next: () => Promise<void>) => {
    const auth = await requireAuth(c);
    if (!auth.ok) return auth.response;
    const rl = await enforceRateLimit(`ai:${auth.userId}`, 60, 60_000);
    if (!rl.ok) {
      return c.json(
        { error: "Rate limit exceeded for AI endpoints", retryAfterSec: rl.retryAfterSec },
        429,
      );
    }
    await next();
  };

  app.use("/make-server-1fc434d6/ai/*", applyAiGuard);
  app.use("/ai/*", applyAiGuard);

  app.use("/make-server-1fc434d6/speech/*", async (c, next) => {
    const auth = await requireAuth(c);
    if (!auth.ok) return auth.response;
    const rl = await enforceRateLimit(`speech:${auth.userId}`, 30, 60_000);
    if (!rl.ok) {
      return c.json(
        { error: "Rate limit exceeded for speech endpoint", retryAfterSec: rl.retryAfterSec },
        429,
      );
    }
    await next();
  });

  app.onError((err, c) => {
    captureServerError(`make-server:${c.req.path}`, err);
    return c.json({ error: "Internal Server Error" }, 500);
  });
}
