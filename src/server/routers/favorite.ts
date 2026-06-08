import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { presentListing } from "@/server/domain/listings";
import { getDb } from "@/server/db/connection";
import { books, favorites, users } from "@/server/db/schema";
import { createRouter, authedQuery } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

export const favoriteRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const rows = await getDb()
      .select({ book: books, ownerName: users.name, ownerAvatar: users.avatar, favoritedAt: favorites.createdAt })
      .from(favorites)
      .innerJoin(books, eq(favorites.bookId, books.id))
      .leftJoin(users, eq(books.ownerId, users.id))
      .where(and(eq(favorites.userId, ctx.user.id), isNull(books.deletedAt)))
      .orderBy(desc(favorites.createdAt));

    return rows.map(({ book, ...row }) => ({ ...presentListing(book), ...row }));
  }),

  toggle: authedQuery
    .input(z.object({ bookId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.userId, ctx.user.id), eq(favorites.bookId, input.bookId)))
        .limit(1);

      if (existing) {
        await db.delete(favorites).where(eq(favorites.id, existing.id));
        return { favorited: false };
      }
      const [listing] = await db
        .select({ id: books.id })
        .from(books)
        .where(and(eq(books.id, input.bookId), eq(books.status, "active"), isNull(books.deletedAt)))
        .limit(1);
      if (!listing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing is not available" });
      }
      await db.insert(favorites).values({ userId: ctx.user.id, bookId: input.bookId });
      return { favorited: true };
    }),

  check: authedQuery
    .input(z.object({ bookId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [favorite] = await getDb()
        .select({ id: favorites.id })
        .from(favorites)
        .where(and(eq(favorites.userId, ctx.user.id), eq(favorites.bookId, input.bookId)))
        .limit(1);
      return { favorited: Boolean(favorite) };
    }),

  checkMany: authedQuery
    .input(z.object({ bookIds: z.array(z.number().int().positive()).max(60) }))
    .query(async ({ ctx, input }) => {
      const bookIds = [...new Set(input.bookIds)];
      if (bookIds.length === 0) return {};

      const rows = await getDb()
        .select({ bookId: favorites.bookId })
        .from(favorites)
        .where(and(eq(favorites.userId, ctx.user.id), inArray(favorites.bookId, bookIds)));
      const favorited = new Set(rows.map((row) => row.bookId));

      return bookIds.reduce<Record<number, boolean>>((acc, bookId) => {
        acc[bookId] = favorited.has(bookId);
        return acc;
      }, {});
    }),
});
