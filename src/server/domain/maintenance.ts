import { and, eq, isNull, lte } from "drizzle-orm";
import { del } from "@vercel/blob";

import { createNotification } from "@/server/domain/notifications";
import { scheduleOutboxProcessing, writeOutboxEvent } from "@/server/domain/outbox";
import { getDb } from "@/server/db/connection";
import { books, listingImages, transactionEvents, transactions, users } from "@/server/db/schema";
import { env } from "@/server/env";

export async function expireSaleReservations(limit = 100) {
  const db = getDb();
  const expired = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "sale_reservation"),
        eq(transactions.status, "accepted"),
        lte(transactions.reservationExpiresAt, new Date()),
      ),
    )
    .limit(limit);

  let count = 0;
  for (const reservation of expired) {
    await db.transaction(async (tx) => {
      const [result] = await tx
        .update(transactions)
        .set({ status: "expired" })
        .where(and(eq(transactions.id, reservation.id), eq(transactions.status, "accepted")));
      if (!result.affectedRows) return;

      await tx
        .update(books)
        .set({ status: "active" })
        .where(and(eq(books.id, reservation.bookId), eq(books.status, "reserved")));
      await tx.insert(transactionEvents).values({
        transactionId: reservation.id,
        type: "transaction.expired",
      });
      await writeOutboxEvent(tx, {
        type: "transaction.expired",
        aggregateType: "transaction",
        aggregateId: reservation.publicId,
        payload: { transactionId: reservation.id, bookId: reservation.bookId },
      });
      await writeOutboxEvent(tx, {
        type: "listing.updated",
        aggregateType: "listing",
        aggregateId: reservation.bookId,
        payload: { listingId: reservation.bookId },
      });
      await createNotification(tx, {
        userId: reservation.requesterId,
        type: "transaction.expired",
        title: "Sale reservation expired",
        body: "The 48-hour reservation expired and the book is available again.",
        link: "/messages",
      });
      count += 1;
    });
  }
  if (count) await scheduleOutboxProcessing();
  return count;
}

export async function anonymizeDeletedRecords(limit = 100) {
  const db = getDb();
  const cutoff = new Date(Date.now() - env.anonymizationRetentionDays * 24 * 60 * 60 * 1000);
  const deletedUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(lte(users.deletedAt, cutoff), isNull(users.anonymizedAt)))
    .limit(limit);
  for (const user of deletedUsers) {
    await db
      .update(users)
      .set({
        name: "Deleted BookSwap member",
        email: null,
        phoneHash: null,
        phoneVerifiedAt: null,
        phoneRevokedAt: null,
        avatar: null,
        location: null,
        country: null,
        city: null,
        bio: null,
        anonymizedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }

  const deletedListings = await db
    .select({ id: books.id })
    .from(books)
    .where(and(lte(books.deletedAt, cutoff), isNull(books.anonymizedAt)))
    .limit(limit);
  for (const listing of deletedListings) {
    const images = await db.select().from(listingImages).where(eq(listingImages.bookId, listing.id));
    if (images.length && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(images.map((image) => image.blobUrl));
    }
    await db.transaction(async (tx) => {
      await tx.delete(listingImages).where(eq(listingImages.bookId, listing.id));
      await tx
        .update(books)
        .set({
          title: "Removed listing",
          author: "Unknown",
          description: null,
          isbn: null,
          imageUrl: null,
          imageUrls: null,
          city: "Removed",
          anonymizedAt: new Date(),
        })
        .where(eq(books.id, listing.id));
    });
  }

  return { users: deletedUsers.length, listings: deletedListings.length };
}
