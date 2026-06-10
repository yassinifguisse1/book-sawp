import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { softDeleteUserByClerkId, upsertUserFromWebhook } from "@/server/db/users";
import {
  claimClerkWebhookEvent,
  releaseClerkWebhookEvent,
} from "@/server/platform/webhook-dedup";

export const runtime = "nodejs";

function resolveClerkWebhookEventId(
  request: NextRequest,
  event: Awaited<ReturnType<typeof verifyWebhook>>,
) {
  const headerId = request.headers.get("svix-id");
  if (headerId) return headerId;

  if ("id" in event && typeof event.id === "string" && event.id.length > 0) {
    return event.id;
  }

  return null;
}

export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("Clerk webhook verification failed", error);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const eventId = resolveClerkWebhookEventId(request, event);
  let claimedWebhook = false;

  if (eventId) {
    const dedup = await claimClerkWebhookEvent(eventId);
    if (dedup === "duplicate") {
      return new Response("ok", { status: 200 });
    }
    claimedWebhook = dedup === "claimed";
  }

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await upsertUserFromWebhook(event.data);
        break;
      case "user.deleted":
        if (event.data.id) {
          await softDeleteUserByClerkId(event.data.id);
        } else {
          console.warn("Clerk user.deleted webhook missing event.data.id", {
            eventType: event.type,
            eventData: event.data,
          });
        }
        break;
      default:
        break;
    }
  } catch (error) {
    if (eventId && claimedWebhook) {
      await releaseClerkWebhookEvent(eventId);
    }
    console.error(`Failed to process Clerk webhook ${event.type}`, error);
    return new Response("Webhook processing failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
