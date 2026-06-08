import { Ratelimit } from "@upstash/ratelimit";
import { env } from "@/server/env";
import { getRedis } from "./cache";
import type { SensitiveAction } from "@/server/domain/types";

const limits: Record<SensitiveAction, { requests: number; window: `${number} ${"s" | "m" | "h"}` }> = {
  "listing.publish": { requests: 10, window: "1 h" },
  "listing.edit": { requests: 30, window: "1 h" },
  "transaction.create": { requests: 20, window: "1 h" },
  "transaction.update": { requests: 40, window: "1 h" },
  "message.start": { requests: 15, window: "1 h" },
  "message.send": { requests: 60, window: "1 m" },
  "review.create": { requests: 10, window: "1 h" },
  "report.create": { requests: 10, window: "1 h" },
};

const rateLimiters = new Map<SensitiveAction, Ratelimit>();

export async function assertSensitiveRateLimit(
  action: SensitiveAction,
  identifiers: { userId: number; ipAddress: string; discriminator?: string },
) {
  if (env.rateLimitBypass || process.env.NODE_ENV !== "production") {
    return;
  }

  const redis = getRedis();
  if (!redis) {
    throw new Error("Rate limit storage is unavailable");
  }

  let limiter = rateLimiters.get(action);
  if (!limiter) {
    const config = limits[action];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      prefix: `bookswap:${action}`,
      analytics: true,
    });
    rateLimiters.set(action, limiter);
  }

  const keys = [
    `user:${identifiers.userId}`,
    `ip:${identifiers.ipAddress}`,
    identifiers.discriminator ? `subject:${identifiers.discriminator}` : null,
  ].filter((key): key is string => Boolean(key));
  const results = await Promise.all(keys.map((key) => limiter.limit(key)));
  if (results.some((result) => !result.success)) {
    throw new Error(`Rate limit exceeded for ${action}`);
  }
}
