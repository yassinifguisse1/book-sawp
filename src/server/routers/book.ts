import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createListing,
  getListingByPublicId,
  getOwnedListingByPublicId,
  listListings,
  listListingFeed,
  listOwnedListings,
  listSimilarListings,
  searchListings,
  updateListing,
  withdrawListing,
} from "@/server/domain/listings";
import { createRouter, publicQuery, authedQuery, activeUserAction } from "@/server/trpc";

const condition = z.enum(["likenew", "verygood", "good", "fair", "poor"]);
const transactionType = z.enum(["swap", "giveaway", "sale"]);
const publicIdInput = z.object({ publicId: z.string().uuid() });
const maxListingImages = 4;
const listingImageUrl = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return value.startsWith("/");
    }
  }, "Use an image URL or site path");
const uploadedListingImageUrl = listingImageUrl.refine((value) => {
  try {
    const url = new URL(value);
    return (
      url.hostname.endsWith(".blob.vercel-storage.com") &&
      url.pathname.startsWith("/listing-covers/")
    );
  } catch {
    return false;
  }
}, "Upload a book cover image before publishing");

const listingFields = {
  title: z.string().trim().min(1).max(255),
  author: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional(),
  genre: z.string().trim().min(1).max(100),
  condition,
  isbn: z.string().trim().max(20).optional(),
  language: z.string().trim().max(50).optional(),
  pages: z.number().int().positive().optional(),
  transactionType,
  price: z.number().nonnegative().optional(),
  shippingCost: z.number().nonnegative().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).default("USD"),
  country: z.string().regex(/^[A-Z]{2}$/).default("US"),
  city: z.string().trim().min(1).max(120).default("Unknown"),
  pickupAvailable: z.boolean().optional(),
  locationId: z.number().int().positive().optional(),
  pickupEnabled: z.boolean().optional(),
  pickupRadiusKm: z.number().int().min(1).max(500).optional(),
  manualShippingEnabled: z.boolean().optional(),
  shippingScope: z
    .enum(["pickup_only", "domestic_only", "selected_countries", "worldwide"])
    .optional(),
  shippingDestinationCountryCodes: z
    .array(z.string().regex(/^[A-Z]{2}$/))
    .max(50)
    .optional(),
  educationLevel: z.string().trim().max(80).optional(),
  schoolType: z.enum(["public_school", "private_school", "not_applicable"]).optional(),
  imageUrl: listingImageUrl.optional(),
  imageUrls: z.array(listingImageUrl).max(maxListingImages).optional(),
};
const createListingFields = {
  ...listingFields,
  imageUrl: uploadedListingImageUrl.optional(),
  imageUrls: z
    .array(uploadedListingImageUrl)
    .min(1, "Upload a book cover image before publishing")
    .max(maxListingImages),
};
const updateListingFields = {
  ...listingFields,
  imageUrl: uploadedListingImageUrl.optional(),
  imageUrls: z.array(uploadedListingImageUrl).max(maxListingImages).optional(),
};

function flattenOwner<
  T extends { owner: { publicId: string; name: string | null; avatar: string | null; location?: string | null; bio?: string | null; createdAt?: Date } },
>(listing: T) {
  const { owner, ...book } = listing;
  return {
    ...book,
    ownerName: owner.name,
    ownerAvatar: owner.avatar,
    ownerPublicId: owner.publicId,
    ownerLocation: owner.location,
    ownerBio: owner.bio,
    ownerJoined: owner.createdAt,
  };
}

export const bookRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        genre: z.string().optional(),
        transactionType: transactionType.optional(),
        condition: condition.optional(),
        search: z.string().optional(),
        sort: z.enum(["recent", "price_asc", "price_desc"]).default("recent"),
        limit: z.number().int().min(1).max(60).default(20),
        offset: z.number().int().min(0).default(0),
        country: z.string().regex(/^[A-Z]{2}$/).optional(),
        city: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const listings = await listListings({
        search: input.search,
        genre: input.genre,
        condition: input.condition,
        type: input.transactionType,
        sort:
          input.sort === "price_asc"
            ? "price-low"
            : input.sort === "price_desc"
              ? "price-high"
              : "newest",
        limit: input.limit,
        offset: input.offset,
        country: input.country,
        city: input.city,
      });
      return listings.map(flattenOwner);
    }),

  search: publicQuery
    .input(
      z.object({
        search: z.string().trim().min(1).max(200),
        genre: z.string().optional(),
        transactionType: transactionType.optional(),
        condition: condition.optional(),
        sort: z.enum(["recent", "price_asc", "price_desc"]).default("recent"),
        limit: z.number().int().min(1).max(60).default(20),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const result = await searchListings({
        search: input.search,
        genre: input.genre,
        condition: input.condition,
        type: input.transactionType,
        sort: input.sort === "price_asc" ? "price-low" : input.sort === "price_desc" ? "price-high" : "newest",
        limit: input.limit,
        offset: input.offset,
      });
      return { ...result, items: result.items.map(flattenOwner) };
    }),

  feed: publicQuery
    .input(
      z.object({
        cursor: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(60).default(20),
        transactionType: transactionType.optional(),
        country: z.string().regex(/^[A-Z]{2}$/).optional(),
        city: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const result = await listListingFeed({
        cursor: input.cursor,
        limit: input.limit,
        type: input.transactionType,
        country: input.country,
        city: input.city,
      });
      return { ...result, items: result.items.map(flattenOwner) };
    }),

  byPublicId: publicQuery.input(publicIdInput).query(async ({ input }) => {
    const listing = await getListingByPublicId(input.publicId);
    if (!listing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
    }
    return flattenOwner(listing);
  }),

  ownedByPublicId: authedQuery.input(publicIdInput).query(async ({ ctx, input }) => {
    const listing = await getOwnedListingByPublicId(ctx.user.id, input.publicId);
    if (!listing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
    }
    return listing;
  }),

  create: activeUserAction("listing.publish")
    .input(z.object(createListingFields))
    .mutation(async ({ ctx, input }) => {
      const listing = await createListing(ctx.user.id, input);
      return { id: listing?.id };
    }),

  update: activeUserAction("listing.edit")
    .input(z.object({ id: z.number().int().positive(), ...updateListingFields }).partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      await updateListing(ctx.user.id, id, updates);
      return { success: true };
    }),

  delete: activeUserAction("listing.edit")
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await withdrawListing(ctx.user.id, input.id);
      return { success: true };
    }),

  myBooks: authedQuery.query(({ ctx }) => listOwnedListings(ctx.user.id)),

  similarByPublicId: publicQuery
    .input(z.object({ publicId: z.string().uuid(), limit: z.number().int().min(1).max(12).default(4) }))
    .query(async ({ input }) => {
      const listing = await getListingByPublicId(input.publicId);
      if (!listing) return [];
      return listSimilarListings(listing.id, listing.genre, input.limit);
    }),
});
