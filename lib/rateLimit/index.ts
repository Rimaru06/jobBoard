import { MemoryRateLimiter } from "@/lib/rateLimit/memory";
import type { RateLimiter } from "@/lib/rateLimit/types";

export type { RateLimiter, RateLimitState } from "@/lib/rateLimit/types";

/**
 * Single rate limiter instance for the whole app (PIN login, admin PIN
 * gate). Local dev / single-instance deployments use the in-memory
 * adapter below.
 *
 * PRODUCTION: swap this for a durable, cross-instance store once
 * deploying to multiple serverless/edge instances — e.g. Upstash
 * Redis, which has a free tier and a first-class rate-limiting
 * library:
 *
 *   npm install @upstash/redis @upstash/ratelimit
 *
 *   import { Redis } from "@upstash/redis";
 *   import { Ratelimit } from "@upstash/ratelimit";
 *   const redis = Redis.fromEnv();
 *   const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "5 m") });
 *
 * Wrap it in a small class implementing the `RateLimiter` interface
 * (isLocked/recordFailure/recordSuccess) and swap the export below —
 * no call sites in lib/actions/*.ts need to change.
 */
export const rateLimiter: RateLimiter = new MemoryRateLimiter();
