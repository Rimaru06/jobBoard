import {
  RATE_LIMIT_LOCKOUT_MS,
  RATE_LIMIT_MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  type RateLimitState,
  type RateLimiter,
} from "@/lib/rateLimit/types";

interface Attempt {
  count: number;
  lockedUntil: number | null;
  windowStart: number;
}

/**
 * Local development implementation — a per-process Map. Correct for a
 * single long-running Node instance, NOT correct across multiple
 * serverless/edge instances (each gets its own memory, so limits reset
 * per instance and can be trivially bypassed by hitting a different
 * one). Fine for this app's current single-server deployment target;
 * see lib/rateLimit/index.ts for the production swap-in point.
 */
export class MemoryRateLimiter implements RateLimiter {
  private attempts = new Map<string, Attempt>();

  async isLocked(identifier: string): Promise<RateLimitState> {
    const record = this.attempts.get(identifier);
    if (!record?.lockedUntil) return { locked: false, retryAfterMs: 0 };
    const remaining = record.lockedUntil - Date.now();
    return remaining > 0 ? { locked: true, retryAfterMs: remaining } : { locked: false, retryAfterMs: 0 };
  }

  async recordFailure(identifier: string): Promise<void> {
    const now = Date.now();
    const existing = this.attempts.get(identifier);

    if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
      this.attempts.set(identifier, { count: 1, lockedUntil: null, windowStart: now });
      return;
    }

    existing.count += 1;
    if (existing.count >= RATE_LIMIT_MAX_ATTEMPTS) {
      existing.lockedUntil = now + RATE_LIMIT_LOCKOUT_MS;
    }
    this.attempts.set(identifier, existing);
  }

  async recordSuccess(identifier: string): Promise<void> {
    this.attempts.delete(identifier);
  }
}
