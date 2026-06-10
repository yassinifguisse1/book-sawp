import { deleteCache, getRedis } from "@/server/platform/cache";
import { env } from "@/server/env";

const CLERK_WEBHOOK_DEDUP_TTL_SECONDS = 60 * 60 * 24 * 7;

function clerkWebhookDedupKey(eventId: string) {
  return `webhook:clerk:${eventId}`;
}

export type WebhookDedupResult = "claimed" | "duplicate" | "unavailable";

export async function claimClerkWebhookEvent(eventId: string): Promise<WebhookDedupResult> {
  const redis = getRedis();
  if (!redis) {
    return "unavailable";
  }

  try {
    const result = await redis.set(`${env.cacheNamespace}:${clerkWebhookDedupKey(eventId)}`, "1", {
      nx: true,
      ex: CLERK_WEBHOOK_DEDUP_TTL_SECONDS,
    });
    return result === "OK" ? "claimed" : "duplicate";
  } catch {
    return "unavailable";
  }
}

export async function releaseClerkWebhookEvent(eventId: string) {
  await deleteCache(clerkWebhookDedupKey(eventId));
}
