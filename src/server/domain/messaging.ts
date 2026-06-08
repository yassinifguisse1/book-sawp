import { and, desc, eq, gt, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "@/server/db/connection";
import { getDb } from "@/server/db/connection";
import { books, conversations, messages, users } from "@/server/db/schema";
import { scanMarketplaceText } from "./anti-scam";
import { scheduleOutboxProcessing, writeOutboxEvent } from "./outbox";
import { createNotification } from "./notifications";

type ConversationDb = Pick<Database, "insert" | "select">;

export function conversationSubjectKey(
  firstUserId: number,
  secondUserId: number,
  bookId: number,
) {
  const [participant1Id, participant2Id] = [firstUserId, secondUserId].sort(
    (a, b) => a - b,
  );
  return {
    participant1Id,
    participant2Id,
    subjectKey: `${participant1Id}:${participant2Id}:${bookId}`,
  };
}

export async function ensureConversation(
  db: ConversationDb,
  input: { userId: number; participantId: number; bookId: number },
) {
  if (input.userId === input.participantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" });
  }

  const key = conversationSubjectKey(input.userId, input.participantId, input.bookId);
  await db
    .insert(conversations)
    .values({ ...key, bookId: input.bookId })
    .onDuplicateKeyUpdate({ set: { lastMessageAt: new Date() } });

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.subjectKey, key.subjectKey))
    .limit(1);

  if (!conversation) {
    throw new Error("Failed to create conversation");
  }
  return conversation;
}

export async function sendMessage(input: {
  userId: number;
  conversationId: number;
  content: string;
}) {
  const sent = await getDb().transaction(async (tx) => {
    const [conversation] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, input.conversationId))
      .limit(1);

    if (!conversation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
    }
    if (
      conversation.participant1Id !== input.userId &&
      conversation.participant2Id !== input.userId
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
    }

    const recentMessages = await tx
      .select({ content: messages.content })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, input.conversationId),
          eq(messages.senderId, input.userId),
          gt(messages.createdAt, new Date(Date.now() - 60 * 1000)),
        ),
      )
      .limit(12);
    const scan = scanMarketplaceText(
      input.content,
      recentMessages.map((message) => message.content),
    );
    const [message] = await tx.insert(messages).values({
      conversationId: input.conversationId,
      senderId: input.userId,
      content: input.content,
      flaggedAt: scan.flagged ? new Date() : null,
    });
    await tx
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, input.conversationId));
    await writeOutboxEvent(tx, {
      type: "message.sent",
      aggregateType: "conversation",
      aggregateId: conversation.publicId,
      payload: {
        conversationId: input.conversationId,
        conversationPublicId: conversation.publicId,
        messageId: Number(message.insertId),
        flagged: scan.flagged,
        reasons: scan.reasons,
      },
    });
    await createNotification(tx, {
      userId:
        conversation.participant1Id === input.userId
          ? conversation.participant2Id
          : conversation.participant1Id,
      type: "message.sent",
      title: "New message",
      body: input.content.slice(0, 180),
      link: `/messages?conversation=${conversation.id}`,
    });

    return { id: message.insertId, flagged: scan.flagged };
  });
  await scheduleOutboxProcessing();
  return sent;
}

export async function startConversation(input: {
  userId: number;
  participantId: number;
  bookId: number;
  initialMessage?: string;
}) {
  const conversation = await ensureConversation(getDb(), input);
  if (input.initialMessage?.trim()) {
    await sendMessage({
      userId: input.userId,
      conversationId: conversation.id,
      content: input.initialMessage.trim(),
    });
  }
  return { id: conversation.id };
}

export async function startListingConversation(input: {
  userId: number;
  bookId: number;
  initialMessage?: string;
}) {
  const db = getDb();
  const [book] = await db
    .select({ id: books.id, ownerId: books.ownerId })
    .from(books)
    .where(
      and(
        eq(books.id, input.bookId),
        inArray(books.status, ["active", "reserved", "completed"]),
        isNull(books.deletedAt),
        isNull(books.suspendedAt),
      ),
    )
    .limit(1);

  if (!book) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
  }

  return startConversation({
    userId: input.userId,
    participantId: book.ownerId,
    bookId: book.id,
    initialMessage: input.initialMessage,
  });
}

export async function listConversations(userId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.participant1Id, userId),
        eq(conversations.participant2Id, userId),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt));

  const otherIds = rows.map((row) =>
    row.participant1Id === userId ? row.participant2Id : row.participant1Id,
  );
  const bookIds = rows.map((row) => row.bookId);
  const otherUsers =
    otherIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, otherIds))
      : [];
  const listingRows =
    bookIds.length > 0 ? await db.select().from(books).where(inArray(books.id, bookIds)) : [];
  const usersById = new Map(otherUsers.map((user) => [user.id, user]));
  const booksById = new Map(listingRows.map((book) => [book.id, book]));

  return rows.map((row) => {
    const otherId =
      row.participant1Id === userId ? row.participant2Id : row.participant1Id;
    const other = usersById.get(otherId);
    const book = booksById.get(row.bookId);
    return {
      ...row,
      otherUserName: other?.name ?? null,
      otherUserAvatar: other?.avatar ?? null,
      bookTitle: book?.title ?? null,
      bookImageUrl: book?.imageUrl ?? null,
      isParticipant1: row.participant1Id === userId,
    };
  });
}

export async function listMessages(userId: number, conversationId: number) {
  const db = getDb();
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conversation) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
  }
  if (
    conversation.participant1Id !== userId &&
    conversation.participant2Id !== userId
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
  }

  return db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      createdAt: messages.createdAt,
      readAt: messages.readAt,
      senderName: users.name,
      senderAvatar: users.avatar,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

export async function markConversationRead(userId: number, conversationId: number) {
  const db = getDb();
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conversation) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
  }
  if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
  }
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
      ),
    );
}

export async function listMessagePage(
  userId: number,
  conversationId: number,
  input: { cursor?: number; limit: number },
) {
  const db = getDb();
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
  if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
  }
  const conditions = [eq(messages.conversationId, conversationId)];
  if (input.cursor) conditions.push(lt(messages.id, input.cursor));
  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.id))
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const page = hasMore ? rows.slice(0, input.limit) : rows;
  const nextCursor = hasMore ? page.at(-1)?.id : undefined;
  return { items: page.reverse(), nextCursor };
}
