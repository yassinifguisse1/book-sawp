import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";

import { scheduleOutboxProcessing, writeOutboxEvent } from "@/server/domain/outbox";
import { toMajorUnits, toMinorUnits, validateListingMoney } from "@/server/domain/validation";
import type { ListingMode } from "@/server/domain/types";
import { getDb } from "@/server/db/connection";
import {
  books,
  listingImages,
  listingShippingDestinations,
  locations,
  uploadedAssets,
  users,
} from "@/server/db/schema";
import { bumpCacheVersion, deleteCache, readCache, writeCache } from "@/server/platform/cache";

export type ShippingScope =
  | "pickup_only"
  | "domestic_only"
  | "selected_countries"
  | "worldwide";

type ListListingsInput = {
  search?: string;
  genre?: string;
  condition?: ListingCondition;
  type?: ListingMode;
  sort?: "newest" | "price-low" | "price-high";
  country?: string;
  city?: string;
  limit?: number;
  offset?: number;
};

type ListingCondition = "likenew" | "verygood" | "good" | "fair" | "poor";
type ListingImageAssetMetadata = {
  blobUrl: string;
  blobPath: string;
  contentType: string;
  sizeBytes: number;
  uploaderPublicId: string;
};

export type CreateListingInput = {
  title: string;
  author: string;
  description?: string;
  genre: string;
  condition: ListingCondition;
  isbn?: string;
  language?: string;
  pages?: number;
  transactionType: ListingMode;
  price?: number;
  shippingCost?: number;
  currency: string;
  country: string;
  city: string;
  pickupAvailable?: boolean;
  locationId?: number;
  pickupEnabled?: boolean;
  pickupRadiusKm?: number;
  manualShippingEnabled?: boolean;
  shippingScope?: ShippingScope;
  shippingDestinationCountryCodes?: string[];
  educationLevel?: string;
  schoolType?: "public_school" | "private_school" | "not_applicable";
  imageUrl?: string;
  imageUrls?: string[];
};

type UpdateListingInput = Partial<CreateListingInput>;

type DerivedDeliveryFields = {
  pickupEnabled: boolean;
  pickupRadiusKm: number | null;
  manualShippingEnabled: boolean;
  shippingScope: ShippingScope;
};

/**
 * Resolves a canonical location and ensures it is active. Returns the
 * country/city to store alongside the FK so legacy filters keep working.
 */
async function resolveListingLocation(locationId: number) {
  const [location] = await getDb()
    .select({
      id: locations.id,
      countryCode: locations.countryCode,
      cityName: locations.cityName,
      isActive: locations.isActive,
    })
    .from(locations)
    .where(eq(locations.id, locationId))
    .limit(1);
  if (!location || !location.isActive) {
    throw new Error("Choose a valid location for this listing.");
  }
  return location;
}

function deriveDeliveryFields(
  input: Pick<
    CreateListingInput,
    | "pickupAvailable"
    | "pickupEnabled"
    | "pickupRadiusKm"
    | "manualShippingEnabled"
    | "shippingScope"
    | "shippingCost"
  >,
): DerivedDeliveryFields {
  const pickupEnabled = input.pickupEnabled ?? input.pickupAvailable ?? false;
  const manualShippingEnabled =
    input.manualShippingEnabled ?? (input.shippingCost !== undefined && input.shippingCost > 0);
  const shippingScope: ShippingScope = manualShippingEnabled
    ? (input.shippingScope ?? "domestic_only")
    : "pickup_only";
  const pickupRadiusKm = input.pickupRadiusKm ?? null;
  return { pickupEnabled, pickupRadiusKm, manualShippingEnabled, shippingScope };
}

function normalizedDestinationCodes(codes: string[] | undefined) {
  return [...new Set((codes ?? []).map((code) => code.trim().toUpperCase()))].filter((code) =>
    /^[A-Z]{2}$/.test(code),
  );
}
const listingCoverContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxListingCoverBytes = 8 * 1024 * 1024;
const minListingCoverWidth = 400;
const minListingCoverHeight = 600;
const maxListingImages = 4;

function normalizedImages(input: Pick<CreateListingInput, "imageUrl" | "imageUrls">) {
  const urls = [...(input.imageUrls ?? []), ...(input.imageUrl ? [input.imageUrl] : [])]
    .map((url) => url.trim())
    .filter(Boolean);
  return [...new Set(urls)].slice(0, maxListingImages);
}

function imageBlobPath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readPngDimensions(bytes: Uint8Array) {
  const isPng =
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  if (!isPng) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function readJpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;

  while (offset + 9 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;

    const segmentLength = view.getUint16(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame && segmentLength >= 7) {
      return {
        width: view.getUint16(offset + 5),
        height: view.getUint16(offset + 3),
      };
    }

    offset += segmentLength;
  }

  return null;
}

function hasAscii(bytes: Uint8Array, offset: number, value: string) {
  if (offset + value.length > bytes.length) return false;
  return [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

function readWebpDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 30 ||
    !hasAscii(bytes, 0, "RIFF") ||
    !hasAscii(bytes, 8, "WEBP")
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (hasAscii(bytes, 12, "VP8X")) {
    return {
      width: readUint24LittleEndian(bytes, 24) + 1,
      height: readUint24LittleEndian(bytes, 27) + 1,
    };
  }
  if (hasAscii(bytes, 12, "VP8L") && bytes.length >= 25 && bytes[20] === 0x2f) {
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (
    hasAscii(bytes, 12, "VP8 ") &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }

  return null;
}

function readImageDimensions(bytes: Uint8Array) {
  return readPngDimensions(bytes) ?? readJpegDimensions(bytes) ?? readWebpDimensions(bytes);
}

async function assertValidListingCoverImage(
  imageUrl: string,
  metadata?: ListingImageAssetMetadata,
) {
  if (metadata) {
    if (
      !metadata.blobPath.startsWith("listing-covers/") ||
      !listingCoverContentTypes.has(metadata.contentType) ||
      metadata.sizeBytes > maxListingCoverBytes
    ) {
      throw new Error("Upload a valid book cover image before publishing.");
    }
  }

  const response = await fetch(imageUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Upload the book cover image before publishing.");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const dimensions = readImageDimensions(bytes);
  if (
    !dimensions ||
    dimensions.width < minListingCoverWidth ||
    dimensions.height < minListingCoverHeight
  ) {
    throw new Error(
      `Cover image must be at least ${minListingCoverWidth} x ${minListingCoverHeight} px.`,
    );
  }
}

function listingCacheKey(id: number) {
  return `listing:${id}`;
}

function listingPublicCacheKey(publicId: string) {
  return `listing:public:${publicId}`;
}

function listCacheKey(input: ListListingsInput, version: number) {
  return `listings:feed:${version}:${JSON.stringify(input)}`;
}

function hasOwner(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      "owner" in value &&
      (value as { owner?: unknown }).owner &&
      typeof (value as { owner?: unknown }).owner === "object",
  );
}

function cachedListingItems(value: unknown) {
  const items = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)
      ? (value as { items: unknown[] }).items
      : null;

  if (!items || !items.every(hasOwner)) return null;
  return items as Awaited<ReturnType<typeof queryListings>>["items"];
}

function cachedListingWithOwner<T>(value: unknown) {
  return hasOwner(value) ? (value as T) : null;
}

const transientDatabaseCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "PROTOCOL_CONNECTION_LOST",
  "ER_LOCK_DEADLOCK",
  "ER_LOCK_WAIT_TIMEOUT",
]);

function databaseErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { code: undefined, errno: undefined, message: undefined };
  }
  const candidate = error as { code?: string; errno?: number; message?: string };
  return {
    code: candidate.code,
    errno: candidate.errno,
    message: candidate.message,
  };
}

function isTransientDatabaseError(error: unknown) {
  const { code, errno, message } = databaseErrorDetails(error);
  return (
    Boolean(code && transientDatabaseCodes.has(code)) ||
    errno === 1205 ||
    errno === 1213 ||
    Boolean(message?.toLowerCase().includes("connection") && message.toLowerCase().includes("closed"))
  );
}

async function withTransientReadRetry<T>(label: string, operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientDatabaseError(error)) {
      throw error;
    }
    const { code, errno, message } = databaseErrorDetails(error);
    console.warn("listing.read.retry", { label, code, errno, message });
    await new Promise((resolve) => setTimeout(resolve, 80));
    return operation();
  }
}

function escapedLikePattern(value: string) {
  return `%${value.trim().replace(/[!%_]/g, "!$&")}%`;
}

function containsEscaped(
  column: typeof books.title | typeof books.author | typeof books.genre | typeof books.isbn,
  pattern: string,
) {
  return sql`${column} LIKE ${pattern} ESCAPE '!'`;
}

export function presentListing<
  T extends { priceMinor: number | null; shippingMinor: number | null },
>(listing: T) {
  return {
    ...listing,
    price: toMajorUnits(listing.priceMinor),
    shippingCost: toMajorUnits(listing.shippingMinor) ?? "0.00",
  };
}

function moneyForListing(input: {
  transactionType: ListingMode;
  price?: number;
  shippingCost?: number;
  currency: string;
}) {
  const priceMinor = input.price === undefined ? null : toMinorUnits(input.price);
  const shippingMinor =
    input.shippingCost === undefined ? 0 : toMinorUnits(input.shippingCost);
  const currency = input.currency.toUpperCase();
  validateListingMoney(
    input.transactionType,
    priceMinor === null ? null : { amountMinor: priceMinor, currency },
  );
  return { priceMinor, shippingMinor, currency };
}

export async function listListings(input: ListListingsInput) {
  const version = (await readCache<number>("listings:feed:version")) ?? 0;
  const cacheKey = listCacheKey(input, version);
  const cached = await readCache<unknown>(cacheKey);
  const cachedItems = cachedListingItems(cached);
  if (cachedItems) return cachedItems;
  if (cached) await deleteCache(cacheKey);

  const result = await withTransientReadRetry("listListings", () => queryListings(input));
  await writeCache(cacheKey, result, 45);
  return result.items;
}

async function queryListings(input: ListListingsInput) {
  const db = getDb();
  const conditions = [
    eq(books.status, "active"),
    isNull(books.deletedAt),
    isNull(books.suspendedAt),
  ];

  if (input.search?.trim()) {
    const pattern = escapedLikePattern(input.search);
    conditions.push(
      or(
        containsEscaped(books.title, pattern),
        containsEscaped(books.author, pattern),
        containsEscaped(books.genre, pattern),
        containsEscaped(books.isbn, pattern),
      )!,
    );
  }
  if (input.genre) conditions.push(eq(books.genre, input.genre));
  if (input.condition) conditions.push(eq(books.condition, input.condition));
  if (input.type) conditions.push(eq(books.transactionType, input.type));
  if (input.country) conditions.push(eq(books.country, input.country.toUpperCase()));
  if (input.city) conditions.push(eq(books.city, input.city));

  const orderBy =
    input.sort === "price-low"
      ? books.priceMinor
      : input.sort === "price-high"
        ? desc(books.priceMinor)
        : desc(books.createdAt);

  const rows = await db
    .select({ book: books, owner: users })
    .from(books)
    .innerJoin(users, eq(books.ownerId, users.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(input.limit ?? 60)
    .offset(input.offset ?? 0);

  return {
    items: rows.map(({ book, owner }) => ({
      ...presentListing(book),
      owner,
    })),
    degradedSearch: false,
  };
}

export async function searchListings(input: ListListingsInput & { search: string }) {
  return withTransientReadRetry("searchListings", () => queryListings(input));
}

export async function getListingById(id: number) {
  const cacheKey = listingCacheKey(id);
  const cached = await readCache<unknown>(cacheKey);
  const cachedListing = cachedListingWithOwner<Awaited<ReturnType<typeof queryListingById>>>(cached);
  if (cachedListing) return cachedListing;
  if (cached) await deleteCache(cacheKey);

  const result = await withTransientReadRetry("getListingById", () => queryListingById(id));
  if (result) await writeCache(cacheKey, result, 60);
  return result;
}

export async function getListingByPublicId(publicId: string) {
  const cacheKey = listingPublicCacheKey(publicId);
  const cached = await readCache<unknown>(cacheKey);
  const cachedListing = cachedListingWithOwner<Awaited<ReturnType<typeof queryListingByPublicId>>>(cached);
  if (cachedListing) return cachedListing;
  if (cached) await deleteCache(cacheKey);

  const result = await withTransientReadRetry("getListingByPublicId", () =>
    queryListingByPublicId(publicId),
  );
  if (result) await writeCache(cacheKey, result, 60);
  return result;
}

export async function getOwnedListingByPublicId(ownerId: number, publicId: string) {
  const db = getDb();
  const [listing] = await withTransientReadRetry("getOwnedListingByPublicId", () =>
    db
      .select()
      .from(books)
      .where(and(eq(books.publicId, publicId), eq(books.ownerId, ownerId), isNull(books.deletedAt)))
      .limit(1),
  );

  return listing ? presentListing(listing) : null;
}

async function queryListingById(id: number) {
  const db = getDb();
  const [result] = await db
    .select({ book: books, owner: users })
    .from(books)
    .innerJoin(users, eq(books.ownerId, users.id))
    .where(
      and(
        eq(books.id, id),
        inArray(books.status, ["active", "reserved", "completed"]),
        isNull(books.deletedAt),
        isNull(books.suspendedAt),
      ),
    )
    .limit(1);

  if (!result) return null;
  return { ...presentListing(result.book), owner: result.owner };
}

async function queryListingByPublicId(publicId: string) {
  const db = getDb();
  const [result] = await db
    .select({ book: books, owner: users })
    .from(books)
    .innerJoin(users, eq(books.ownerId, users.id))
    .where(
      and(
        eq(books.publicId, publicId),
        inArray(books.status, ["active", "reserved", "completed"]),
        isNull(books.deletedAt),
        isNull(books.suspendedAt),
      ),
    )
    .limit(1);

  if (!result) return null;
  return { ...presentListing(result.book), owner: result.owner };
}

export async function createListing(ownerId: number, input: CreateListingInput) {
  const money = moneyForListing(input);
  const images = normalizedImages(input);
  if (images.length === 0) {
    throw new Error("Upload a book cover image before publishing.");
  }

  const db = getDb();
  const [owner] = await db
    .select({ publicId: users.publicId })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);
  if (!owner) {
    throw new Error("Listing owner not found.");
  }

  const uploadedMetadata =
    images.length > 0
      ? await db.select().from(uploadedAssets).where(inArray(uploadedAssets.blobUrl, images))
      : [];
  const metadataByUrl = new Map<string, ListingImageAssetMetadata>(
    uploadedMetadata.map((asset) => [asset.blobUrl, asset]),
  );
  const missingOrForeignImages = images.filter((imageUrl) => {
    const asset = metadataByUrl.get(imageUrl);
    return !asset || asset.uploaderPublicId !== owner.publicId;
  });
  if (missingOrForeignImages.length > 0) {
    throw new Error("Upload the book cover image before publishing.");
  }
  await Promise.all(
    images.map((imageUrl) => assertValidListingCoverImage(imageUrl, metadataByUrl.get(imageUrl))),
  );

  const location = input.locationId ? await resolveListingLocation(input.locationId) : null;
  const delivery = deriveDeliveryFields(input);
  const destinationCodes =
    delivery.shippingScope === "selected_countries"
      ? normalizedDestinationCodes(input.shippingDestinationCountryCodes)
      : [];

  const id = await db.transaction(async (tx) => {
    const result = await tx.insert(books).values({
      title: input.title,
      author: input.author,
      description: input.description,
      genre: input.genre,
      condition: input.condition,
      isbn: input.isbn,
      language: input.language,
      pages: input.pages,
      transactionType: input.transactionType,
      status: "active",
      ownerId,
      currency: money.currency,
      priceMinor: money.priceMinor,
      shippingMinor: money.shippingMinor,
      country: (location?.countryCode ?? input.country).toUpperCase(),
      city: location?.cityName ?? input.city,
      locationId: location?.id ?? null,
      pickupEnabled: delivery.pickupEnabled,
      pickupRadiusKm: delivery.pickupRadiusKm,
      manualShippingEnabled: delivery.manualShippingEnabled,
      shippingScope: delivery.shippingScope,
      educationLevel: input.educationLevel,
      schoolType: input.schoolType,
      pickupAvailable: delivery.pickupEnabled,
      imageUrl: images[0],
      imageUrls: images,
    });
    const listingId = result[0].insertId;

    if (destinationCodes.length > 0) {
      await tx
        .insert(listingShippingDestinations)
        .values(destinationCodes.map((countryCode) => ({ listingId, countryCode })));
    }

    if (images.length) {
      await tx.insert(listingImages).values(
        images.map((blobUrl, sortOrder) => {
          const asset = metadataByUrl.get(blobUrl);
          return {
            bookId: listingId,
            blobUrl,
            blobPath: asset?.blobPath ?? imageBlobPath(blobUrl),
            sortOrder,
            contentType: asset?.contentType ?? "image/unknown",
            sizeBytes: asset?.sizeBytes ?? 0,
          };
        }),
      );
    }

    await writeOutboxEvent(tx, {
      type: "listing.published",
      aggregateType: "listing",
      aggregateId: listingId,
      payload: { listingId },
    });
    return listingId;
  });

  await scheduleOutboxProcessing();
  return getListingById(id);
}

export async function updateListing(
  ownerId: number,
  listingId: number,
  input: UpdateListingInput,
) {
  const db = getDb();
  const current = await getOwnedEditableListing(ownerId, listingId);
  const transactionType = input.transactionType ?? current.transactionType;
  const currentPrice = current.priceMinor === null ? undefined : current.priceMinor / 100;
  const price =
    transactionType === "sale"
      ? input.price ?? (current.transactionType === "sale" ? currentPrice : undefined)
      : undefined;
  const money = moneyForListing({
    transactionType,
    currency: input.currency ?? current.currency,
    price,
    shippingCost: input.shippingCost ?? current.shippingMinor / 100,
  });
  const images =
    input.imageUrl !== undefined || input.imageUrls !== undefined
      ? normalizedImages(input)
      : undefined;
  const uploadedMetadata =
    images && images.length > 0
      ? await db.select().from(uploadedAssets).where(inArray(uploadedAssets.blobUrl, images))
      : [];
  const metadataByUrl = new Map<string, ListingImageAssetMetadata>(
    uploadedMetadata.map((asset) => [asset.blobUrl, asset]),
  );

  if (images && images.length > 0) {
    const [owner] = await db
      .select({ publicId: users.publicId })
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1);
    if (!owner) {
      throw new Error("Listing owner not found.");
    }
    const foreignImages = images.filter((imageUrl) => {
      const asset = metadataByUrl.get(imageUrl);
      return !asset || asset.uploaderPublicId !== owner.publicId;
    });
    if (foreignImages.length > 0) {
      throw new Error("Upload the book cover image before publishing.");
    }
  }

  const location = input.locationId ? await resolveListingLocation(input.locationId) : null;
  const delivery = deriveDeliveryFields({
    pickupAvailable: input.pickupAvailable,
    pickupEnabled: input.pickupEnabled ?? current.pickupEnabled,
    pickupRadiusKm: input.pickupRadiusKm ?? current.pickupRadiusKm ?? undefined,
    manualShippingEnabled:
      input.manualShippingEnabled ??
      (input.shippingCost !== undefined ? input.shippingCost > 0 : current.manualShippingEnabled),
    shippingScope: input.shippingScope ?? current.shippingScope,
    shippingCost: input.shippingCost ?? current.shippingMinor / 100,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(books)
      .set({
        title: input.title,
        author: input.author,
        description: input.description,
        genre: input.genre,
        condition: input.condition,
        isbn: input.isbn,
        language: input.language,
        pages: input.pages,
        transactionType,
        priceMinor: money.priceMinor,
        shippingMinor: money.shippingMinor,
        currency: money.currency,
        country: (location?.countryCode ?? input.country)?.toUpperCase(),
        city: location?.cityName ?? input.city,
        locationId: location?.id,
        pickupEnabled: delivery.pickupEnabled,
        manualShippingEnabled: delivery.manualShippingEnabled,
        shippingScope: delivery.shippingScope,
        pickupRadiusKm: delivery.pickupRadiusKm,
        educationLevel: input.educationLevel,
        schoolType: input.schoolType,
        pickupAvailable: delivery.pickupEnabled,
        imageUrl: images ? images[0] ?? null : undefined,
        imageUrls: images,
      })
      .where(eq(books.id, listingId));

    if (!delivery.manualShippingEnabled || delivery.shippingScope !== "selected_countries") {
      await tx
        .delete(listingShippingDestinations)
        .where(eq(listingShippingDestinations.listingId, listingId));
    } else if (
      input.shippingScope !== undefined ||
      input.shippingDestinationCountryCodes !== undefined
    ) {
      await tx
        .delete(listingShippingDestinations)
        .where(eq(listingShippingDestinations.listingId, listingId));
      const codes = normalizedDestinationCodes(input.shippingDestinationCountryCodes);
      if (codes.length > 0) {
        await tx
          .insert(listingShippingDestinations)
          .values(codes.map((countryCode) => ({ listingId, countryCode })));
      }
    }

    if (images) {
      await tx.delete(listingImages).where(eq(listingImages.bookId, listingId));
      if (images.length) {
        await tx.insert(listingImages).values(
          images.map((blobUrl, sortOrder) => {
            const asset = metadataByUrl.get(blobUrl);
            return {
              bookId: listingId,
              blobUrl,
              blobPath: asset?.blobPath ?? imageBlobPath(blobUrl),
              sortOrder,
              contentType: asset?.contentType ?? "image/unknown",
              sizeBytes: asset?.sizeBytes ?? 0,
            };
          }),
        );
      }
    }

    await writeOutboxEvent(tx, {
      type: "listing.updated",
      aggregateType: "listing",
      aggregateId: listingId,
      payload: { listingId },
    });
  });

  await invalidateListingCache(listingId);
  await scheduleOutboxProcessing();
  return getListingById(listingId);
}

export async function withdrawListing(ownerId: number, listingId: number) {
  const db = getDb();
  await getOwnedEditableListing(ownerId, listingId);
  await db.transaction(async (tx) => {
    await tx
      .update(books)
      .set({ status: "withdrawn", deletedAt: new Date() })
      .where(and(eq(books.id, listingId), eq(books.ownerId, ownerId)));
    await writeOutboxEvent(tx, {
      type: "listing.withdrawn",
      aggregateType: "listing",
      aggregateId: listingId,
      payload: { listingId },
    });
  });
  await invalidateListingCache(listingId);
  await scheduleOutboxProcessing();
}

export async function invalidateListingCache(listingId: number) {
  const [listing] = await getDb()
    .select({ publicId: books.publicId })
    .from(books)
    .where(eq(books.id, listingId))
    .limit(1);

  await Promise.all([
    deleteCache(listingCacheKey(listingId)),
    listing ? deleteCache(listingPublicCacheKey(listing.publicId)) : Promise.resolve(),
    bumpCacheVersion("listings:feed:version"),
  ]);
}

async function getOwnedEditableListing(ownerId: number, listingId: number) {
  const db = getDb();
  const [listing] = await db
    .select()
    .from(books)
    .where(and(eq(books.id, listingId), eq(books.ownerId, ownerId), isNull(books.deletedAt)))
    .limit(1);
  if (!listing) throw new Error("Listing not found");
  if (!["draft", "active"].includes(listing.status)) {
    throw new Error("Only draft or active listings can be edited");
  }
  return listing;
}

export async function listOwnedListings(ownerId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(books)
    .where(and(eq(books.ownerId, ownerId), isNull(books.deletedAt)))
    .orderBy(desc(books.createdAt));
  return rows.map(presentListing);
}

export async function listUserListings(ownerId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(books)
    .where(and(eq(books.ownerId, ownerId), eq(books.status, "active"), isNull(books.deletedAt)))
    .orderBy(desc(books.createdAt));
  return rows.map(presentListing);
}

export async function listSimilarListings(
  listingId: number,
  genre?: string | null,
  limit = 4,
) {
  const db = getDb();
  const conditions = [
    ne(books.id, listingId),
    eq(books.status, "active"),
    isNull(books.deletedAt),
  ];
  if (genre) conditions.push(eq(books.genre, genre));
  const rows = await withTransientReadRetry("listSimilarListings", () =>
    db
      .select()
      .from(books)
      .where(and(...conditions))
      .orderBy(desc(books.createdAt))
      .limit(limit),
  );
  return rows.map(presentListing);
}

export async function listListingFeed(input: {
  cursor?: number;
  limit: number;
  type?: ListingMode;
  country?: string;
  city?: string;
}) {
  const conditions = [eq(books.status, "active"), isNull(books.deletedAt)];
  if (input.cursor) conditions.push(lt(books.id, input.cursor));
  if (input.type) conditions.push(eq(books.transactionType, input.type));
  if (input.country) conditions.push(eq(books.country, input.country));
  if (input.city) conditions.push(eq(books.city, input.city));
  const rows = await withTransientReadRetry("listListingFeed", () =>
    getDb()
      .select({ book: books, owner: users })
      .from(books)
      .innerJoin(users, eq(books.ownerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(books.id))
      .limit(input.limit + 1),
  );
  const hasMore = rows.length > input.limit;
  const page = hasMore ? rows.slice(0, input.limit) : rows;
  return {
    items: page.map(({ book, owner }) => ({ ...presentListing(book), owner })),
    nextCursor: hasMore ? page.at(-1)?.book.id : undefined,
  };
}
