import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/server/db/connection";
import { notifications } from "@/server/db/schema";
import { createRouter, authedQuery } from "@/server/trpc";

export const notificationRouter = createRouter({
  list: authedQuery.query(({ ctx }) =>
    getDb()
      .select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(80),
  ),
  markRead: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),
});
