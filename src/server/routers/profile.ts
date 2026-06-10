import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { presentListing } from "@/server/domain/listings";
import { getDb } from "@/server/db/connection";
import { books, reviews, users, type Book } from "@/server/db/schema";
import { createRouter, publicQuery, authedQuery } from "@/server/trpc";
import {
  getUserBrowsePreference,
  getUserHomeLocationId,
  saveUserBrowsePreference,
  saveUserHomeLocation,
} from "@/server/domain/browse-preferences";
import { getLocationProvider } from "@/server/platform/location";

const publicIdInput = z.object({ publicId: z.string().uuid() });

function presentPublicProfileListing(book: Book) {
  const listing = presentListing(book);
  return {
    publicId: listing.publicId,
    title: listing.title,
    author: listing.author,
    genre: listing.genre,
    condition: listing.condition,
    transactionType: listing.transactionType,
    status: listing.status,
    currency: listing.currency,
    price: listing.price,
    imageUrl: listing.imageUrl,
    createdAt: listing.createdAt,
  };
}

export const profileRouter = createRouter({
  public: publicQuery.input(publicIdInput).query(async ({ input }) => {
    const db = getDb();
    const [profileRow] = await db
      .select({
        id: users.id,
        publicId: users.publicId,
        name: users.name,
        avatar: users.avatar,
        location: users.location,
        country: users.country,
        city: users.city,
        bio: users.bio,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.publicId, input.publicId),
          isNull(users.deletedAt),
          isNull(users.bannedAt),
          isNull(users.suspendedAt),
        ),
      )
      .limit(1);

    if (!profileRow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
    }
    const { id, ...profile } = profileRow;

    const [listingRows, reviewRows] = await Promise.all([
      db
        .select()
        .from(books)
        .where(
          and(
            eq(books.ownerId, id),
            eq(books.status, "active"),
            isNull(books.deletedAt),
            isNull(books.suspendedAt),
          ),
        )
        .orderBy(desc(books.createdAt)),
      db
        .select({
          publicId: reviews.publicId,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          reviewerName: users.name,
          reviewerAvatar: users.avatar,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.reviewerId, users.id))
        .where(eq(reviews.revieweeId, id))
        .orderBy(desc(reviews.createdAt)),
    ]);

    return {
      user: profile,
      books: listingRows.map(presentPublicProfileListing),
      reviews: reviewRows,
    };
  }),

  getBrowsePreferences: authedQuery.query(({ ctx }) =>
    getUserBrowsePreference(ctx.user.id),
  ),

  saveBrowsePreferences: authedQuery
    .input(
      z.object({
        browseLocationId: z.number().int().positive().nullable().optional(),
        radiusKm: z.number().int().min(1).max(20000).optional(),
        includeDomesticShipping: z.boolean().optional(),
        includeInternationalShipping: z.boolean().optional(),
        locationSource: z
          .enum(["manual_selection", "profile_default", "browser_geolocation", "ip_suggestion"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.browseLocationId) {
        const place = await getLocationProvider().resolvePlace({
          locationId: input.browseLocationId,
        });
        if (!place) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown location" });
        }
      }
      return saveUserBrowsePreference(ctx.user.id, input);
    }),

  getHomeLocation: authedQuery.query(async ({ ctx }) => {
    const homeLocationId = await getUserHomeLocationId(ctx.user.id);
    if (!homeLocationId) return null;
    return getLocationProvider().resolvePlace({ locationId: homeLocationId });
  }),

  saveHomeLocation: authedQuery
    .input(z.object({ locationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const place = await getLocationProvider().resolvePlace({ locationId: input.locationId });
      if (!place) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown location" });
      }
      await saveUserHomeLocation(ctx.user.id, input.locationId);
      return { locationId: place.locationId, label: place.label };
    }),
});
