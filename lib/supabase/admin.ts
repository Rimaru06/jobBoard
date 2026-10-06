import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client — bypasses RLS entirely. This is intentional and
 * scoped tightly: it's only for the handful of operations that *are*
 * the trust boundary itself (checking a PIN hash, creating a user from
 * a redeemed invite, admin invite management), where there's no
 * session yet for RLS to key off of.
 *
 * NEVER import this into lib/actions/jobs.ts or any other regular data
 * action — those go through lib/supabase/server.ts so RLS still
 * applies once policies are live. Every call site using this client
 * must itself verify a PIN, an admin session, or a single-use invite
 * token before touching the database.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
