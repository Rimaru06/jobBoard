/**
 * Durable adapter interface for brute-force/attempt rate limiting.
 * Implementations may be local (in-memory) or remote (Redis) — callers
 * never know which, and every method is async so a network-backed
 * adapter is a drop-in replacement with no call-site changes.
 */
export interface RateLimitState {
  locked: boolean;
  retryAfterMs: number;
}

export interface RateLimiter {
  /** Current lock state for `identifier` (e.g. a user id or "admin-pin"). */
  isLocked(identifier: string): Promise<RateLimitState>;
  /** Record a failed attempt; may trigger a lockout once past the threshold. */
  recordFailure(identifier: string): Promise<void>;
  /** Clear attempt history after a successful auth. */
  recordSuccess(identifier: string): Promise<void>;
}

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_LOCKOUT_MS = 60_000; // 1 minute
export const RATE_LIMIT_WINDOW_MS = 5 * 60_000; // failed attempts older than this don't count
