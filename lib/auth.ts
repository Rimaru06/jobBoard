import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * The current user's identity, read from the signed session cookie.
 * Read-only and safe to call from Server Components — never writes
 * cookies (that only happens in Server Actions; see lib/actions/auth.ts).
 *
 * This is a convenience for "who is this," not itself an authorization
 * check — nothing here is a security boundary. Actual access control
 * goes through Supabase RLS once policies are live, and privileged
 * operations (lib/actions/auth.ts, lib/actions/admin.ts) verify PINs
 * or the admin session directly rather than trusting this alone.
 */
export async function getCurrentUser(): Promise<{ id: string; name: string; role: string } | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return { id: payload.sub, name: payload.name, role: payload.role };
}
