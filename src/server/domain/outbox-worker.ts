import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";

import { invalidateListingCache } from "@/server/domain/listings";
import { getDb } from "@/server/db/connection";
import { books, notifications, outboxEvents, users } from "@/server/db/schema";
import { sendTransactionalEmail } from "@/server/platform/email";
import { publishConversationEvent } from "@/server/platform/realtime";
import { indexListing, removeListingFromIndex } from "@/server/platform/search";

async function processListingEvent(payload: Record<string, unknown>) {
  const listingId = Number(payload.listingId);
  if (!Number.isInteger(listingId)) return;
  const [listing] = await getDb().select().from(books).where(eq(books.id, listingId)).limit(1);
  await invalidateListingCache(listingId);

  if (!listing || listing.status !== "active" || listing.deletedAt) {
    if (listing) await removeListingFromIndex(listing.publicId);
    return;
  }
  await indexListing({
    objectID: listing.publicId,
    title: listing.title,
    author: listing.author,
    isbn: listing.isbn,
    genre: listing.genre,
    condition: listing.condition,
    mode: listing.transactionType,
    language: listing.language,
    country: listing.country,
    city: listing.city,
    currency: listing.currency,
    priceMinor: listing.priceMinor,
    createdAt: listing.createdAt.getTime(),
  });
}

async function processNotificationEvent(payload: Record<string, unknown>) {
  const notificationId = Number(payload.notificationId);
  if (!Number.isInteger(notificationId)) return;
  const [row] = await getDb()
    .select({ notification: notifications, email: users.email })
    .from(notifications)
    .innerJoin(users, eq(notifications.userId, users.id))
    .where(eq(notifications.id, notificationId))
    .limit(1);
  if (!row?.email) return;
  await sendTransactionalEmail({
    to: row.email,
    subject: row.notification.title,
    html: `<p>${escapeHtml(row.notification.body)}</p>`,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function deliver(event: typeof outboxEvents.$inferSelect) {
  if (event.type.startsWith("listing.")) {
    await processListingEvent(event.payload);
  } else if (event.type === "message.sent") {
    const conversationPublicId = String(event.payload.conversationPublicId ?? "");
    if (conversationPublicId) {
      await publishConversationEvent(conversationPublicId, event.type, event.payload);
    }
  } else if (event.type === "notification.created") {
    await processNotificationEvent(event.payload);
  }
}

export async function processOutboxBatch(limit = 30) {
  const db = getDb();
  const events = await db
    .select()
    .from(outboxEvents)
    .where(
      and(
        isNull(outboxEvents.processedAt),
        isNull(outboxEvents.deadLetteredAt),
        lte(outboxEvents.availableAt, new Date()),
      ),
    )
    .orderBy(asc(outboxEvents.createdAt))
    .limit(limit);

  let failed = 0;
  for (const event of events) {
    try {
      await deliver(event);
      await db
        .update(outboxEvents)
        .set({ processedAt: new Date(), attempts: sql`${outboxEvents.attempts} + 1` })
        .where(and(eq(outboxEvents.id, event.id), isNull(outboxEvents.processedAt)));
    } catch (error) {
      failed += 1;
      await db
        .update(outboxEvents)
        .set({
          attempts: sql`${outboxEvents.attempts} + 1`,
          deadLetteredAt: event.attempts >= 9 ? new Date() : null,
          lastError: error instanceof Error ? error.message.slice(0, 2000) : "Unknown worker error",
        })
        .where(eq(outboxEvents.id, event.id));
    }
  }
  return { processed: events.length - failed, failed, remaining: events.length === limit };
}
