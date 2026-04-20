import type { Hono } from "npm:hono";
import {
  INVITE_INVALID_ERROR,
  captureServerError,
  cleanupCreatedSignupUser,
  consumeInvite,
  enforceRateLimit,
  findAvailableInvite,
  getClientIp,
  normalizeInviteCode,
  supabaseAdmin,
} from "../platform.ts";

export function registerAuthRoutes(app: Hono) {
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
