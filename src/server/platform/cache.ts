import { Redis } from "@upstash/redis";
import superjson from "superjson";
import { env } from "@/server/env";

let redis: Redis | undefined;

export function getRedis() {
  if (!env.upstashRedisRestUrl || !env.upstashRedisRestToken) {
    return null;
  }
  redis ??= new Redis({
    url: env.upstashRedisRestUrl,
    token: env.upstashRedisRestToken,
  });
  return redis;
}

function namespacedKey(key: string) {
  return `${env.cacheNamespace}:${key}`;
}

export async function readCache<T>(key: string) {
  try {
    const value = await getRedis()?.get<T | string>(namespacedKey(key));
    return typeof value === "string" ? superjson.parse<T>(value) : value ?? null;
  } catch {
    return null;
  }
}

export async function writeCache(key: string, value: unknown, ttlSeconds = 60) {
  try {
    await getRedis()?.set(namespacedKey(key), superjson.stringify(value), { ex: ttlSeconds });
  } catch {
    // Public browsing must remain available when Redis is degraded.
  }
}

export async function deleteCache(...keys: string[]) {
  try {
    if (keys.length > 0) {
      await getRedis()?.del(...keys.map(namespacedKey));
    }
  } catch {
    // Outbox retries will attempt cache invalidation again.
  }
}

export async function bumpCacheVersion(key: string) {
  try {
    await getRedis()?.incr(namespacedKey(key));
  } catch {
    // Public browsing must remain available when Redis is degraded.
  }
}
