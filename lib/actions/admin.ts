"use server";

import { cookies, headers } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/session";
import { rateLimiter } from "@/lib/rateLimit";
import { handleServerActionError, type ActionResult } from "@/lib/errors";
import { adminPinSchema } from "@/lib/validations/pin";
import { generateInviteSchema } from "@/lib/validations/invite";
import type { InviteToken } from "@/types/database";

/** True if the current request carries a valid admin session cookie. */
export async function isAdminSession(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminSessionToken(token);
}

async function requireAdmin() {
  if (!(await isAdminSession())) {
    throw Object.assign(new Error("Admin session required"), { code: "UNAUTHORIZED" as const });
  }
}

/**
 * Verify the Master Admin PIN and, on success, set an HTTP-only signed
 * admin session cookie. This PIN is a deploy-time secret (its bcrypt
 * hash lives in ADMIN_PIN_HASH), not a row in `users` — there's no
 * user to look up yet when bootstrapping the very first invite.
 */
export async function verifyAdminPin(pin: string): Promise<ActionResult<null>> {
  try {
    const parsedPin = adminPinSchema.safeParse({ pin });
    if (!parsedPin.success) {
      return { data: null, error: { message: parsedPin.error.issues[0].message, code: "VALIDATION" } };
    }

    const identifier = "admin-pin"; // single global identity for this gate
    const lock = await rateLimiter.isLocked(identifier);
    if (lock.locked) {
      return {
        data: null,
        error: {
          message: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterMs / 1000)}s.`,
          code: "RATE_LIMITED",
        },
      };
    }

    const hash = process.env.ADMIN_PIN_HASH;
    console.log("ADMIN_PIN_HASH:", hash); // Log the hash for debugging purposes
    console.log(pin); // Log the provided pin for debugging purposes
    if (!hash) throw new Error("ADMIN_PIN_HASH is not configured");

    const valid = await bcrypt.compare(pin, hash);
    if (!valid) {
      await rateLimiter.recordFailure(identifier);
      return { data: null, error: { message: "Incorrect PIN.", code: "UNAUTHORIZED" } };
    }

    await rateLimiter.recordSuccess(identifier);
    const token = await createAdminSessionToken();
    cookies().set(ADMIN_SESSION_COOKIE, token, adminCookieOptions);
    return { data: null, error: null };
  } catch (err) {
    return handleServerActionError(err, "verifyAdminPin");
  }
}

export async function adminLogout(): Promise<void> {
  cookies().delete(ADMIN_SESSION_COOKIE);
}

/**
 * Generate a single-use invite: a random token (returned once, never
 * stored) plus its hash (stored in invite_tokens for lookup at
 * redemption). Only the hash ever touches the database, so a DB leak
 * alone can't be used to redeem invites.
 */
export async function generateInvite(assignedName: string): Promise<ActionResult<{ link: string }>> {
  try {
    await requireAdmin();

    const parsed = generateInviteSchema.safeParse({ assignedName });
    if (!parsed.success) {
      return { data: null, error: { message: parsed.error.issues[0].message, code: "VALIDATION" } };
    }
    const name = parsed.data.assignedName;

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const supabase = createAdminClient();
    const { error } = await supabase.from("invite_tokens").insert({
      token_hash: tokenHash,
      assigned_name: name,
    });
    if (error) throw error;

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? `https://${headers().get("host")}`;
    return { data: { link: `${origin}/join?token=${rawToken}` }, error: null };
  } catch (err) {
    return handleServerActionError(err, "generateInvite");
  }
}

/** Recent invites for the dashboard list — status only, raw tokens are never retrievable after creation. */
export async function listInvites(): Promise<
  ActionResult<Pick<InviteToken, "id" | "assigned_name" | "is_used" | "used_at" | "created_at">[]>
> {
  try {
    await requireAdmin();

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("invite_tokens")
      .select("id, assigned_name, is_used, used_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return { data: data ?? [], error: null };
  } catch (err) {
    return handleServerActionError(err, "listInvites");
  }
}
