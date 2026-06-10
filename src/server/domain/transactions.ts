import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "@/server/db/connection";
import { books, transactionEvents, transactions, users } from "@/server/db/schema";
import { ensureConversation } from "./messaging";
import { scheduleOutboxProcessing, writeOutboxEvent } from "./outbox";
import { createNotification } from "./notifications";
import { transactionKindForMode, toMajorUnits } from "./validation";
import type { TransactionStatus } from "./types";
import { assertTransactionTransition } from "./transaction-state";

function ensureAffected(result: { affectedRows?: number }, message: string) {
  if (!result.affectedRows) {
    throw new TRPCError({ code: "CONFLICT", message });
  }
}

async function writeListingChangedEvents(
  db: Parameters<typeof writeOutboxEvent>[0],
  listingIds: Array<number | null>,
) {
  for (const listingId of listingIds) {
    if (!listingId) continue;
    await writeOutboxEvent(db, {
      type: "listing.updated",
      aggregateType: "listing",
      aggregateId: listingId,
      payload: { listingId },
    });
  }
}

export async function createTransaction(input: {
  requesterId: number;
  bookId: number;
  offeredBookId?: number;
  idempotencyKey?: string;
  message?: string;
}) {
  const idempotencyKey = input.idempotencyKey ?? randomUUID();

  const created = await getDb().transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.idempotencyKey, idempotencyKey))
      .limit(1);
    if (existing[0]) {
      if (
        existing[0].bookId === input.bookId &&
        existing[0].requesterId === input.requesterId
      ) {
        return { id: existing[0].id };
      }
      throw new TRPCError({
        code: "CONFLICT",
        message: "Idempotency key mismatch",
      });
    }
    const [book] = await tx
      .select()
      .from(books)
      .where(and(eq(books.id, input.bookId), eq(books.status, "active")))
      .limit(1);

    if (!book) {
      throw new TRPCError({ code: "CONFLICT", message: "Book is no longer available" });
    }
    if (book.ownerId === input.requesterId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot request your own book" });
    }

    const kind = transactionKindForMode(book.transactionType);
    let offeredBookId: number | null = null;
    if (kind === "swap_request") {
      if (!input.offeredBookId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Swap requires an offered book" });
      }
      const [offered] = await tx
        .select()
        .from(books)
        .where(
          and(
            eq(books.id, input.offeredBookId),
            eq(books.ownerId, input.requesterId),
            eq(books.status, "active"),
          ),
        )
        .limit(1);
      if (!offered) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Offered book is unavailable" });
      }
      offeredBookId = offered.id;
    }

    const isReservation = kind === "sale_reservation";
    if (isReservation) {
      const [result] = await tx
        .update(books)
        .set({ status: "reserved" })
        .where(and(eq(books.id, book.id), eq(books.status, "active")));
      ensureAffected(result, "Book was reserved by another user");
    }

    const expiresAt = isReservation
      ? new Date(Date.now() + 48 * 60 * 60 * 1000)
      : null;
    const [created] = await tx.insert(transactions).values({
      idempotencyKey,
      bookId: book.id,
      requesterId: input.requesterId,
      ownerId: book.ownerId,
      offeredBookId,
      type: kind,
      status: isReservation ? "accepted" : "pending",
      message: input.message ?? null,
      priceMinor: isReservation ? book.priceMinor : null,
      currency: isReservation ? book.currency : null,
      reservationExpiresAt: expiresAt,
    });
    const transactionId = Number(created.insertId);
    await tx.insert(transactionEvents).values({
      transactionId,
      actorUserId: input.requesterId,
      type: isReservation ? "reservation.created" : "request.created",
    });
    await ensureConversation(tx, {
      userId: input.requesterId,
      participantId: book.ownerId,
      bookId: book.id,
    });
    await writeOutboxEvent(tx, {
      type: "transaction.created",
      aggregateType: "transaction",
      aggregateId: transactionId,
      payload: { transactionId, bookId: book.id, kind },
    });
    if (isReservation) {
      await writeListingChangedEvents(tx, [book.id]);
    }
    await createNotification(tx, {
      userId: book.ownerId,
      type: "transaction.created",
      title: isReservation ? "New sale reservation" : "New book request",
      body: `${book.title} has a new ${kind.replaceAll("_", " ")}.`,
      link: "/messages",
    });
    return { id: transactionId };
  });
  await scheduleOutboxProcessing();
  return created;
}

export async function updateTransactionStatus(input: {
  actorId: number;
  transactionId: number;
  status: Exclude<TransactionStatus, "pending" | "expired">;
  message?: string;
}) {
  return updateTransactionStatusInternal(input);
}

export async function adminUpdateTransactionStatus(input: {
  actorId: number;
  transactionId: number;
  status: Extract<TransactionStatus, "completed" | "cancelled">;
  message?: string;
}) {
  return updateTransactionStatusInternal({ ...input, adminOverride: true });
}

async function updateTransactionStatusInternal(input: {
  actorId: number;
  transactionId: number;
  status: Exclude<TransactionStatus, "pending" | "expired">;
  message?: string;
  adminOverride?: boolean;
}) {
  const updated = await getDb().transaction(async (tx) => {
    const [transaction] = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.id, input.transactionId))
      .limit(1);
    if (!transaction) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
    }
    if (
      !input.adminOverride &&
      transaction.ownerId !== input.actorId &&
      transaction.requesterId !== input.actorId
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
    }
    try {
      assertTransactionTransition({
        current: transaction.status,
        next: input.status,
        isOwner: input.adminOverride || transaction.ownerId === input.actorId,
      });
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Invalid transaction transition",
      });
    }

    if (input.status === "accepted") {
      if (
        !input.adminOverride &&
        (transaction.ownerId !== input.actorId || transaction.status !== "pending")
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending requests can be accepted by the owner" });
      }
      const [target] = await tx
        .update(books)
        .set({ status: "reserved" })
        .where(and(eq(books.id, transaction.bookId), eq(books.status, "active")));
      ensureAffected(target, "Target book is no longer available");
      if (transaction.offeredBookId) {
        const [offered] = await tx
          .update(books)
          .set({ status: "reserved" })
          .where(
            and(
              eq(books.id, transaction.offeredBookId),
              eq(books.status, "active"),
            ),
        );
        ensureAffected(offered, "Offered book is no longer available");
      }
      const reservedBookIds = transaction.offeredBookId
        ? [transaction.bookId, transaction.offeredBookId]
        : [transaction.bookId];
      const conflictingTransactions = await tx
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.status, "pending"),
            ne(transactions.id, transaction.id),
            or(
              inArray(transactions.bookId, reservedBookIds),
              inArray(transactions.offeredBookId, reservedBookIds),
            ),
          ),
        );
      await tx
        .update(transactions)
        .set({ status: "declined" })
        .where(
          and(
            eq(transactions.status, "pending"),
            ne(transactions.id, transaction.id),
            or(
              inArray(transactions.bookId, reservedBookIds),
              inArray(transactions.offeredBookId, reservedBookIds),
            ),
          ),
        );
      if (conflictingTransactions.length) {
        await tx.insert(transactionEvents).values(
          conflictingTransactions.map((conflict) => ({
            transactionId: conflict.id,
            actorUserId: input.actorId,
            type: "transaction.declined_conflict",
          })),
        );
      }
    } else if (input.status === "declined") {
      if (
        !input.adminOverride &&
        (transaction.ownerId !== input.actorId || transaction.status !== "pending")
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending requests can be declined by the owner" });
      }
    } else if (input.status === "completed") {
      if (
        !input.adminOverride &&
        (transaction.ownerId !== input.actorId || transaction.status !== "accepted")
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only the owner can complete an accepted transaction" });
      }
      await tx.update(books).set({ status: "completed" }).where(eq(books.id, transaction.bookId));
      if (transaction.offeredBookId) {
        await tx.update(books).set({ status: "completed" }).where(eq(books.id, transaction.offeredBookId));
      }
    } else if (!["pending", "accepted"].includes(transaction.status)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Transaction cannot be cancelled" });
    }

    if (input.status === "cancelled" && transaction.status === "accepted") {
      await tx.update(books).set({ status: "active" }).where(eq(books.id, transaction.bookId));
      if (transaction.offeredBookId) {
        await tx.update(books).set({ status: "active" }).where(eq(books.id, transaction.offeredBookId));
      }
    }

    const [result] = await tx
      .update(transactions)
      .set({
        status: input.status,
        message: input.message ?? transaction.message,
        completedAt: input.status === "completed" ? new Date() : null,
      })
      .where(and(eq(transactions.id, transaction.id), eq(transactions.status, transaction.status)));
    ensureAffected(result, "Transaction was changed by another request");
    await tx.insert(transactionEvents).values({
      transactionId: transaction.id,
      actorUserId: input.actorId,
      type: `transaction.${input.status}`,
    });
    await writeOutboxEvent(tx, {
      type: `transaction.${input.status}`,
      aggregateType: "transaction",
      aggregateId: transaction.publicId,
      payload: { transactionId: transaction.id, bookId: transaction.bookId },
    });
    if (input.status === "accepted" || input.status === "completed" || input.status === "cancelled") {
      await writeListingChangedEvents(tx, [transaction.bookId, transaction.offeredBookId]);
    }
    await createNotification(tx, {
      userId:
        transaction.ownerId === input.actorId
          ? transaction.requesterId
          : transaction.ownerId,
      type: `transaction.${input.status}`,
      title: "Book request updated",
      body: `Your book request is now ${input.status}.`,
      link: "/messages",
    });
    return { success: true };
  });
  await scheduleOutboxProcessing();
  return updated;
}

const transactionSelection = {
  id: transactions.id,
  bookId: transactions.bookId,
  requesterId: transactions.requesterId,
  ownerId: transactions.ownerId,
  offeredBookId: transactions.offeredBookId,
  type: transactions.type,
  status: transactions.status,
  message: transactions.message,
  priceMinor: transactions.priceMinor,
  currency: transactions.currency,
  createdAt: transactions.createdAt,
  updatedAt: transactions.updatedAt,
  bookTitle: books.title,
  bookImageUrl: books.imageUrl,
  bookTransactionType: books.transactionType,
};

export async function listIncomingTransactions(userId: number) {
  const rows = await getDb()
    .select({ ...transactionSelection, requesterName: users.name, requesterAvatar: users.avatar })
    .from(transactions)
    .leftJoin(books, eq(transactions.bookId, books.id))
    .leftJoin(users, eq(transactions.requesterId, users.id))
    .where(eq(transactions.ownerId, userId))
    .orderBy(desc(transactions.createdAt));
  return rows.map((row) => ({ ...row, price: toMajorUnits(row.priceMinor) }));
}

export async function listOutgoingTransactions(userId: number) {
  const rows = await getDb()
    .select({ ...transactionSelection, ownerName: users.name, ownerAvatar: users.avatar })
    .from(transactions)
    .leftJoin(books, eq(transactions.bookId, books.id))
    .leftJoin(users, eq(transactions.ownerId, users.id))
    .where(eq(transactions.requesterId, userId))
    .orderBy(desc(transactions.createdAt));
  return rows.map((row) => ({ ...row, price: toMajorUnits(row.priceMinor) }));
}
