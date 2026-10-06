"use server";

import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE,
  UID_COOKIE,
  sessionCookieOptions,
  uidCookieOptions,
  createSessionToken,
} from "@/lib/session";
import { rateLimiter } from "@/lib/rateLimit";
import { handleServerActionError, type ActionResult } from "@/lib/errors";
import { pinSchema } from "@/lib/validations/pin";

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

async function establishSession(user: { id: string; name: string; role: "admin" | "friend" }) {
  const token = await createSessionToken({ sub: user.id, name: user.name, role: user.role });
  cookies().set(SESSION_COOKIE, token, sessionCookieOptions);
  // fb_uid is NOT a credential — it only lets /login greet the right
  // person by name after a session expires. Someone can't authenticate
  // with it alone; loginWithPin below still requires the correct PIN.
  cookies().set(UID_COOKIE, user.id, uidCookieOptions);
}

/**
 * Validate an invite token for display purposes (the /join page uses
 * this to greet the person by name before they've set a PIN). Does
 * NOT consume the token — only redeemInvite does that, atomically.
 */
export async function validateInviteToken(
  rawToken: string
): Promise<ActionResult<{ assignedName: string } | null>> {
  try {
    if (!rawToken) return { data: null, error: null };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("invite_tokens")
      .select("assigned_name, is_used")
      .eq("token_hash", hashToken(rawToken))
      .maybeSingle();

    if (error) throw error;
    if (!data || data.is_used) return { data: null, error: null };

    return { data: { assignedName: data.assigned_name }, error: null };
  } catch (err) {
    return handleServerActionError(err, "validateInviteToken");
  }
}

/**
 * Redeem a single-use invite: set a PIN, create the user, and mark the
 * token as used so it can never be reused while remaining visible to admins.
 *
 * Consuming the token is a two-step, deliberately ordered process:
 *   1. Atomically claim it — `UPDATE ... WHERE is_used = false` is a
 *      single Postgres statement, so two simultaneous redemptions of
 *      the same link can't both succeed (the loser's WHERE matches
 *      zero rows and gets a clean "already used" error).
 *   2. Only after the claim succeeds, create the user row. The used
 *      token remains as an audit record for the Creator Dashboard.
 * If user creation fails after the claim succeeds, the token is
 * already burned rather than reusable — the admin would need to issue
 * a fresh invite. That's a deliberate trade-off (favors "never
 * reusable" over "never lost"); wrapping both steps in a single
 * Postgres function/transaction would close this gap if it matters.
 */
export async function redeemInvite(rawToken: string, pin: string): Promise<ActionResult<null>> {
  try {
    const parsedPin = pinSchema.safeParse(pin);
    if (!parsedPin.success) {
      return { data: null, error: { message: parsedPin.error.issues[0].message, code: "VALIDATION" } };
    }

    const supabase = createAdminClient();
    const tokenHash = hashToken(rawToken);

    const { data: claimed, error: claimError } = await supabase
      .from("invite_tokens")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("token_hash", tokenHash)
      .eq("is_used", false)
      .select("id, assigned_name")
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) {
      return {
        data: null,
        error: { message: "This invite link is invalid or has already been used.", code: "NOT_FOUND" },
      };
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({ name: claimed.assigned_name, pin_hash: pinHash, role: "friend" })
      .select("id, name, role")
      .single();

    if (userError) throw userError;

    await establishSession(user);
    return { data: null, error: null };
  } catch (err) {
    return handleServerActionError(err, "redeemInvite");
  }
}

/**
 * Frictionless re-login after a session expires: the browser still
 * has fb_uid (who), so the person only has to re-enter their PIN, not
 * their name — this is the only thing this action needs as input.
 */
export async function loginWithPin(userId: string, pin: string): Promise<ActionResult<null>> {
  try {
    const lock = await rateLimiter.isLocked(userId);
    if (lock.locked) {
      return {
        data: null,
        error: {
          message: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterMs / 1000)}s.`,
          code: "RATE_LIMITED",
        },
      };
    }

    const parsedPin = pinSchema.safeParse(pin);
    if (!parsedPin.success) {
      return { data: null, error: { message: parsedPin.error.issues[0].message, code: "VALIDATION" } };
    }

    const supabase = createAdminClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, role, pin_hash")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return { data: null, error: { message: "We couldn't find that account.", code: "NOT_FOUND" } };
    }

    const valid = await bcrypt.compare(pin, user.pin_hash);
    if (!valid) {
      await rateLimiter.recordFailure(userId);
      return { data: null, error: { message: "Incorrect PIN.", code: "UNAUTHORIZED" } };
    }

    await rateLimiter.recordSuccess(userId);
    await establishSession(user);
    return { data: null, error: null };
  } catch (err) {
    return handleServerActionError(err, "loginWithPin");
  }
}

export async function logout(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
  cookies().delete(UID_COOKIE);
}

/** For /login: who to greet, if this browser has been here before. */
export async function getRememberedUser(): Promise<ActionResult<{ id: string; name: string } | null>> {
  try {
    const uid = cookies().get(UID_COOKIE)?.value;
    if (!uid) return { data: null, error: null };

    const supabase = createAdminClient();
    const { data, error } = await supabase.from("users").select("id, name").eq("id", uid).maybeSingle();
    if (error) throw error;
    return { data: data ?? null, error: null };
  } catch (err) {
    return handleServerActionError(err, "getRememberedUser");
  }
}
