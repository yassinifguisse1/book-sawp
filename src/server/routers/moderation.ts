import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { scheduleOutboxProcessing, writeOutboxEvent } from "@/server/domain/outbox";
import { getDb } from "@/server/db/connection";
import { books, moderationAuditLogs, reports, users } from "@/server/db/schema";
import { createRouter, activeUserAction, staffQuery } from "@/server/trpc";

export const moderationRouter = createRouter({
  report: activeUserAction("report.create")
    .input(
      z.object({
        targetType: z.enum(["user", "listing", "message"]),
        targetId: z.number().int().positive(),
        reason: z.string().trim().min(1).max(80),
        details: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const reportId = await db.transaction(async (tx) => {
        const [report] = await tx.insert(reports).values({ reporterId: ctx.user.id, ...input });
        const id = Number(report.insertId);
        await writeOutboxEvent(tx, {
          type: "moderation.reported",
          aggregateType: "report",
          aggregateId: id,
          payload: { reportId: id, targetType: input.targetType, targetId: input.targetId },
        });
        return id;
      });
      await scheduleOutboxProcessing();
      return { id: reportId };
    }),

  queue: staffQuery.query(() =>
    getDb().select().from(reports).where(eq(reports.status, "open")).orderBy(asc(reports.createdAt)).limit(100),
  ),

  updateReport: staffQuery
    .input(z.object({ id: z.number().int().positive(), status: z.enum(["reviewing", "resolved", "dismissed"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.transaction(async (tx) => {
        await tx
          .update(reports)
          .set({ status: input.status, assignedToId: ctx.user.id })
          .where(and(eq(reports.id, input.id)));
        await tx.insert(moderationAuditLogs).values({
          actorUserId: ctx.user.id,
          action: `report.${input.status}`,
          targetType: "report",
          targetId: input.id,
        });
      });
      return { success: true };
    }),

  suspendUser: staffQuery
    .input(z.object({ userId: z.number().int().positive(), suspended: z.boolean(), notes: z.string().trim().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.transaction(async (tx) => {
        await tx.update(users).set({ suspendedAt: input.suspended ? new Date() : null }).where(eq(users.id, input.userId));
        await tx.insert(moderationAuditLogs).values({
          actorUserId: ctx.user.id,
          action: input.suspended ? "user.suspended" : "user.restored",
          targetType: "user",
          targetId: input.userId,
          metadata: { notes: input.notes },
        });
      });
      return { success: true };
    }),

  takedownListing: staffQuery
    .input(z.object({ listingId: z.number().int().positive(), suspended: z.boolean(), notes: z.string().trim().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.transaction(async (tx) => {
        await tx
          .update(books)
          .set({ status: input.suspended ? "suspended" : "withdrawn", suspendedAt: input.suspended ? new Date() : null })
          .where(eq(books.id, input.listingId));
        await tx.insert(moderationAuditLogs).values({
          actorUserId: ctx.user.id,
          action: input.suspended ? "listing.suspended" : "listing.restored",
          targetType: "listing",
          targetId: input.listingId,
          metadata: { notes: input.notes },
        });
        await writeOutboxEvent(tx, {
          type: input.suspended ? "listing.suspended" : "listing.updated",
          aggregateType: "listing",
          aggregateId: input.listingId,
          payload: { listingId: input.listingId },
        });
      });
      await scheduleOutboxProcessing();
      return { success: true };
    }),
});
