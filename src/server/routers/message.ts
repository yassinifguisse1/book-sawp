import { z } from "zod";

import {
  listConversations,
  listMessages,
  listMessagePage,
  markConversationRead,
  sendMessage,
  startListingConversation,
} from "@/server/domain/messaging";
import { createRouter, activeUserAction, authedQuery } from "@/server/trpc";

export const messageRouter = createRouter({
  conversations: authedQuery.query(({ ctx }) => listConversations(ctx.user.id)),

  byConversation: authedQuery
    .input(z.object({ conversationId: z.number().int().positive() }))
    .query(({ ctx, input }) => listMessages(ctx.user.id, input.conversationId)),

  page: authedQuery
    .input(z.object({ conversationId: z.number().int().positive(), cursor: z.number().int().positive().optional(), limit: z.number().int().min(1).max(100).default(40) }))
    .query(({ ctx, input }) => listMessagePage(ctx.user.id, input.conversationId, input)),

  send: activeUserAction("message.send")
    .input(z.object({ conversationId: z.number().int().positive(), content: z.string().trim().min(1).max(2000) }))
    .mutation(({ ctx, input }) => sendMessage({ userId: ctx.user.id, ...input })),

  startConversation: activeUserAction("message.start")
    .input(
      z.object({
        bookId: z.number().int().positive(),
        initialMessage: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(({ ctx, input }) => startListingConversation({ userId: ctx.user.id, ...input })),

  markRead: authedQuery
    .input(z.object({ conversationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await markConversationRead(ctx.user.id, input.conversationId);
      return { success: true };
    }),
});
