import { z } from "zod";

import {
  createTransaction,
  listIncomingTransactions,
  listOutgoingTransactions,
  updateTransactionStatus,
} from "@/server/domain/transactions";
import { createRouter, activeUserAction, authedQuery } from "@/server/trpc";

export const transactionRouter = createRouter({
  create: activeUserAction("transaction.create")
    .input(
      z.object({
        bookId: z.number().int().positive(),
        offeredBookId: z.number().int().positive().optional(),
        idempotencyKey: z.string().min(8).max(80).optional(),
        message: z.string().trim().max(2000).optional(),

      }),
    )
    .mutation(({ ctx, input }) =>
      createTransaction({
        requesterId: ctx.user.id,
        bookId: input.bookId,
        offeredBookId: input.offeredBookId,
        idempotencyKey: input.idempotencyKey,
        message: input.message,
      }),
    ),

  updateStatus: activeUserAction("transaction.update")
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["accepted", "declined", "completed", "cancelled"]),
        message: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      updateTransactionStatus({
        actorId: ctx.user.id,
        transactionId: input.id,
        status: input.status,
        message: input.message,
      }),
    ),

  myOffers: authedQuery.query(({ ctx }) => listIncomingTransactions(ctx.user.id)),
  myRequests: authedQuery.query(({ ctx }) => listOutgoingTransactions(ctx.user.id)),
});
