import { and, desc, eq, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { scheduleOutboxProcessing, writeOutboxEvent } from "@/server/domain/outbox";
import { getDb } from "@/server/db/connection";
import { reviews, transactions, users } from "@/server/db/schema";
import { createRouter, activeUserAction, authedQuery } from "@/server/trpc";

export const reviewRouter = createRouter({
  create: activeUserAction("review.create")
    .input(
      z.object({
        revieweeId: z.number().int().positive(),
        transactionId: z.number().int().positive(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.revieweeId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot review yourself" });
      }
      const db = getDb();
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, input.transactionId),
            eq(transactions.status, "completed"),
            or(eq(transactions.ownerId, ctx.user.id), eq(transactions.requesterId, ctx.user.id)),
          ),
        )
        .limit(1);
      if (!transaction) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only completed transactions can be reviewed" });
      }
      const expectedReviewee =
        transaction.ownerId === ctx.user.id ? transaction.requesterId : transaction.ownerId;
      if (input.revieweeId !== expectedReviewee) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Reviewee is not the other participant" });
      }

      const reviewId = await db.transaction(async (tx) => {
        const [review] = await tx.insert(reviews).values({
          reviewerId: ctx.user.id,
          revieweeId: input.revieweeId,
          transactionId: input.transactionId,
          rating: input.rating,
          comment: input.comment,
        });
        const id = Number(review.insertId);
        await writeOutboxEvent(tx, {
          type: "review.created",
          aggregateType: "review",
          aggregateId: id,
          payload: { reviewId: id, revieweeId: input.revieweeId },
        });
        return id;
      });
      await scheduleOutboxProcessing();
      return { id: reviewId };
    }),

  myReviews: authedQuery.query(({ ctx }) =>
    getDb()
      .select({
        id: reviews.id,
        reviewerId: reviews.reviewerId,
        revieweeId: reviews.revieweeId,
        transactionId: reviews.transactionId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        revieweeName: users.name,
        revieweeAvatar: users.avatar,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.revieweeId, users.id))
      .where(eq(reviews.reviewerId, ctx.user.id))
      .orderBy(desc(reviews.createdAt)),
  ),
});
