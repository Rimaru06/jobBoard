import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/types/database";

// ── cookie names & shared options ───────────────────────────────────

export const SESSION_COOKIE = "fb_session";
export const UID_COOKIE = "fb_uid"; // not a credential — see JoinForm/login flow notes below
export const ADMIN_SESSION_COOKIE = "fb_admin_session";

const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days
const UID_MAX_AGE_S = 60 * 60 * 24 * 365; // 1 year
const ADMIN_SESSION_MAX_AGE_S = 60 * 60 * 12; // 12 hours — deliberately shorter, re-auth more often

export const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const sessionCookieOptions = { ...baseCookieOptions, maxAge: SESSION_MAX_AGE_S };
export const uidCookieOptions = { ...baseCookieOptions, maxAge: UID_MAX_AGE_S };
export const adminCookieOptions = { ...baseCookieOptions, maxAge: ADMIN_SESSION_MAX_AGE_S };

// ── user session tokens ──────────────────────────────────────────────

export interface SessionPayload {
  sub: string; // user id
  name: string;
  role: UserRole;
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(sessionSecret());
}

/** Verifies a user session token. Safe to call from middleware (Edge runtime). */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return { sub: payload.sub, name: payload.name, role: payload.role as UserRole };
  } catch {
    return null; // expired, malformed, or bad signature — all treated as "not logged in"
  }
}

// ── admin session tokens (separate secret — a leaked user session
//    secret should never be enough to forge admin access) ───────────

function adminSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_MAX_AGE_S}s`)
    .sign(adminSecret());
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, adminSecret());
    return payload.admin === true;
  } catch {
    return false;
  }
}
