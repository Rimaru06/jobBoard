/**
 * Centralized error handling for Server Actions.
 *
 * Every server action follows the same shape:
 *   1. wrap the body in a try/catch
 *   2. on success, return { data, error: null }
 *   3. on failure, call handleServerActionError(err, context) in the
 *      catch block and return its result
 *
 * This keeps raw Postgres/Supabase errors (and their internals) out of
 * the client entirely, while still logging enough detail server-side
 * to debug. See lib/actions/*.ts (Part 2) for real usage.
 */

export type ActionResult<T> = { data: T; error: null } | { data: null; error: ActionError };

export type ActionError = {
  message: string; // safe to show the user
  code: ErrorCode;
  // Structured extra data for errors the UI needs to react to beyond
  // just showing `message` — e.g. DUPLICATE carries the existing job
  // so the form can offer "track it instead" without a second fetch.
  meta?: Record<string, unknown>;
};

export type ErrorCode =
  "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "DUPLICATE" | "RATE_LIMITED" | "UNKNOWN";

// Common Postgres/PostgREST error codes we want to translate into
// friendly, specific messages instead of a generic fallback.
const PG_ERROR_MAP: Record<string, { message: string; code: ErrorCode }> = {
  "23505": { message: "That already exists.", code: "CONFLICT" }, // unique_violation
  "23503": { message: "That record no longer exists.", code: "NOT_FOUND" }, // foreign_key_violation
  "23502": { message: "A required field is missing.", code: "VALIDATION" }, // not_null_violation
  "42501": { message: "You don't have permission to do that.", code: "UNAUTHORIZED" }, // insufficient_privilege (RLS)
  PGRST116: { message: "That item couldn't be found.", code: "NOT_FOUND" }, // no rows for .single()
};

const FALLBACK_MESSAGE = "Something went wrong on our end. Please try again.";

/**
 * Call from the catch block of any Server Action. Logs the real error
 * server-side (with context for tracing) and returns a safe,
 * user-friendly ActionResult to send to the client.
 *
 * @param err - the caught error, typically a Supabase/PostgrestError
 * @param context - short label identifying the action, e.g. "createJob"
 */
export function handleServerActionError(err: unknown, context: string): ActionResult<never> {
  // Next.js encodes redirect()/notFound()/dynamic-server-usage as thrown
  // errors carrying a `digest` starting with "NEXT_" so its own request
  // boundary can catch them further up the tree. Swallowing them here
  // (like any other error) would break redirects and misreport routine
  // rendering control-flow as a real failure — always let them through.
  if (isNextInternalError(err)) {
    throw err;
  }

  const timestamp = new Date().toISOString();

  // Supabase/PostgREST errors carry a `code` and `message`.
  const postgrestError = isPostgrestError(err) ? err : undefined;
  const pgCode = postgrestError?.code;
  const mapped = pgCode ? PG_ERROR_MAP[pgCode] : undefined;

  // Structured server-side log — code/message/details/hint are always
  // present as keys (null when absent) so log consumers/queries don't
  // need to special-case missing fields. Swap console.error for a real
  // logger (e.g. pino, or Supabase's own logging) when we wire up
  // monitoring; never include raw secrets (env vars, tokens) here.
  console.error(
    JSON.stringify({
      level: "error",
      context,
      timestamp,
      code: pgCode ?? null,
      message: getErrorMessage(err),
      details: postgrestError?.details ? stringifyLogValue(postgrestError.details) : null,
      hint: postgrestError?.hint ? stringifyLogValue(postgrestError.hint) : null,
    })
  );

  if (mapped) {
    return { data: null, error: mapped };
  }

  if (isAuthError(err)) {
    return { data: null, error: { message: "Please sign in again.", code: "UNAUTHORIZED" } };
  }

  return { data: null, error: { message: FALLBACK_MESSAGE, code: "UNKNOWN" } };
}

// --- type guards -----------------------------------------------------

function isError(err: unknown): err is Error {
  return err instanceof Error;
}

function isPostgrestError(
  err: unknown
): err is { code: string; message?: unknown; details?: unknown; hint?: unknown } {
  return typeof err === "object" && err !== null && "code" in err && typeof (err as any).code === "string";
}

function getErrorMessage(err: unknown): string {
  if (isError(err)) return err.message;
  if (isPostgrestError(err) && err.message !== undefined) return stringifyLogValue(err.message);
  return stringifyLogValue(err);
}

function stringifyLogValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isAuthError(err: unknown): boolean {
  return isError(err) && /auth|session|jwt/i.test(err.message);
}

function isNextInternalError(err: unknown): boolean {
  // Next.js encodes its own control-flow signals (redirect, notFound,
  // dynamic-server-usage during static generation, etc.) as thrown
  // errors carrying a string `.digest` — real Postgrest/JS errors never
  // have this field, so its mere presence is a safe, general signal to
  // let the error keep propagating untouched.
  return typeof err === "object" && err !== null && typeof (err as { digest?: unknown }).digest === "string";
}
