import type { Hono } from "npm:hono";
import {
  INVITE_INVALID_ERROR,
  captureServerError,
  cleanupCreatedSignupUser,
  consumeInvite,
  createWechatSession,
  enforceRateLimit,
  findAvailableInvite,
  getClientIp,
  normalizeInviteCode,
  supabaseAdmin,
} from "../platform.ts";

type WechatCodeSession = {
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function shortHash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

async function exchangeWechatCode(code: string): Promise<WechatCodeSession> {
  const appid = Deno.env.get("WECHAT_MINIPROGRAM_APPID");
  const secret = Deno.env.get("WECHAT_MINIPROGRAM_SECRET");
  if (!appid || !secret) {
    throw new Error("WECHAT_MINIPROGRAM_APPID/SECRET not configured");
  }

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const resp = await fetch(url.toString());
  const data = await resp.json() as WechatCodeSession;
  if (!resp.ok || data.errcode || !data.openid) {
    throw new Error(data.errmsg || `WeChat code exchange failed: ${resp.status}`);
  }
  return data;
}

export function registerAuthRoutes(app: Hono) {
  const wechatLoginHandler = async (c: any) => {
    try {
      const ip = getClientIp(c);
      const ipRl = await enforceRateLimit(`wechat-login:ip:${ip}`, 30, 60 * 60 * 1000);
      if (!ipRl.ok) {
        return c.json(
          { error: "Too many login attempts from this IP", retryAfterSec: ipRl.retryAfterSec },
          429,
        );
      }

      const { code, inviteCode: rawInviteCode } = await c.req.json();
      const loginCode = String(code || "").trim();
      if (!loginCode) {
        return c.json({ error: "code is required" }, 400);
      }

      const wxSession = await exchangeWechatCode(loginCode);
      const openid = String(wxSession.openid || "").trim();
      const unionid = wxSession.unionid ? String(wxSession.unionid).trim() : null;

      const { data: existingIdentity, error: identityLoadError } = await supabaseAdmin
        .from("wechat_identities")
        .select("user_id")
        .eq("openid", openid)
        .maybeSingle();
      if (identityLoadError) throw identityLoadError;

      if (existingIdentity?.user_id) {
        await supabaseAdmin
          .from("wechat_identities")
          .update({ last_login_at: new Date().toISOString() })
          .eq("openid", openid);
        const session = await createWechatSession(existingIdentity.user_id);
        return c.json({
          token: session.token,
          userId: existingIdentity.user_id,
          expiresAt: session.expiresAt,
          isNewUser: false,
        });
      }

      const inviteCode = normalizeInviteCode(rawInviteCode);
      if (!inviteCode) {
        return c.json({ needsInvite: true });
      }
      const invite = await findAvailableInvite(inviteCode);
      if (!invite) {
        return c.json({ error: INVITE_INVALID_ERROR }, 400);
      }

      const emailLocal = `wx_${await shortHash(openid)}`;
      const email = `${emailLocal}@wechat.verbalab.local`;
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword(),
        email_confirm: true,
        app_metadata: { provider: "wechat_miniprogram" },
        user_metadata: { name: "微信用户" },
      });
      if (error) {
        console.log(`WeChat signup error for ${email}: ${error.message}`);
        return c.json({ error: error.message }, 400);
      }

      const userId = data.user?.id;
      if (!userId) {
        await captureServerError("wechat_login_missing_user_id", `Missing user id for ${email}`);
        return c.json({ error: "WeChat login failed: missing user id" }, 500);
      }

      try {
        const consumed = await consumeInvite(invite.id, userId);
        if (!consumed) {
          await cleanupCreatedSignupUser(userId, email, "wechat_invite_conflict");
          return c.json({ error: INVITE_INVALID_ERROR }, 400);
        }

        const { error: insertIdentityError } = await supabaseAdmin
          .from("wechat_identities")
          .insert({
            user_id: userId,
            openid,
            unionid,
            invite_id: invite.id,
            last_login_at: new Date().toISOString(),
          });
        if (insertIdentityError) throw insertIdentityError;
      } catch (err) {
        await captureServerError("wechat_login_bind_identity", err);
        try {
          await cleanupCreatedSignupUser(userId, email, "wechat_identity_error");
        } catch {
          return c.json({ error: "WeChat login cleanup failed" }, 500);
        }
        return c.json({ error: "WeChat login failed during invite binding" }, 500);
      }

      const session = await createWechatSession(userId);
      return c.json({
        token: session.token,
        userId,
        expiresAt: session.expiresAt,
        isNewUser: true,
      });
    } catch (err) {
      await captureServerError("wechat_login_route", err);
      console.log(`Error in wechat login: ${err}`);
      return c.json({ error: `WeChat login failed: ${err}` }, 500);
    }
  };

  app.post("/make-server-1fc434d6/auth/wechat-login", wechatLoginHandler);
  app.post("/auth/wechat-login", wechatLoginHandler);

  app.post("/make-server-1fc434d6/auth/signup", async (c) => {
    try {
      const signupSecret = Deno.env.get("SIGNUP_API_SECRET");
      if (signupSecret) {
        const provided = c.req.header("x-signup-secret");
        if (provided !== signupSecret) {
          return c.json({ error: "Forbidden" }, 403);
        }
      }

      const ip = getClientIp(c);
      const ipRl = await enforceRateLimit(`signup:ip:${ip}`, 10, 60 * 60 * 1000);
      if (!ipRl.ok) {
        return c.json(
          { error: "Too many signup attempts from this IP", retryAfterSec: ipRl.retryAfterSec },
          429,
        );
      }

      const { email, password, name, inviteCode: rawInviteCode } = await c.req.json();
      const inviteCode = normalizeInviteCode(rawInviteCode);

      if (!email || !password || !inviteCode) {
        return c.json({ error: "email, password, and inviteCode are required" }, 400);
      }
      if (String(password).length < 6) {
        return c.json({ error: "Password should be at least 6 characters" }, 400);
      }

      const emailRl = await enforceRateLimit(
        `signup:email:${String(email).toLowerCase()}`,
        3,
        60 * 60 * 1000,
      );
      if (!emailRl.ok) {
        return c.json(
          { error: "Too many signup attempts for this email", retryAfterSec: emailRl.retryAfterSec },
          429,
        );
      }

      const invite = await findAvailableInvite(inviteCode);
      if (!invite) {
        return c.json({ error: INVITE_INVALID_ERROR }, 400);
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: { name: name || "" },
        email_confirm: true,
      });

      if (error) {
        console.log(`Signup error for ${email}: ${error.message}`);
        return c.json({ error: error.message }, 400);
      }

      const userId = data.user?.id;
      if (!userId) {
        await captureServerError("signup_missing_user_id", `Missing user id for ${email}`);
        return c.json({ error: "Signup failed: missing user id" }, 500);
      }

      try {
        const consumed = await consumeInvite(invite.id, userId);
        if (!consumed) {
          await cleanupCreatedSignupUser(userId, email, "invite_conflict");
          return c.json({ error: INVITE_INVALID_ERROR }, 400);
        }
      } catch (consumeErr) {
        await captureServerError("signup_consume_invite", consumeErr);
        try {
          await cleanupCreatedSignupUser(userId, email, "invite_consume_error");
        } catch {
          return c.json({ error: "Signup failed during invite verification cleanup" }, 500);
        }
        return c.json({ error: "Signup failed during invite verification" }, 500);
      }

      console.log(`User created with invite: ${userId} (${email})`);
      return c.json({ success: true, userId: data.user?.id });
    } catch (err) {
      await captureServerError("signup_route", err);
      console.log(`Error in signup: ${err}`);
      return c.json({ error: `Signup failed: ${err}` }, 500);
    }
  });
}
