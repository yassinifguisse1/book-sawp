import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  double,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const publicId = () =>
  varchar("publicId", { length: 36 })
    .notNull()
    .$defaultFn(() => randomUUID());

export const users = mysqlTable(
  "users",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    clerkUserId: varchar("clerkUserId", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 320 }),
    emailVerifiedAt: timestamp("emailVerifiedAt"),
    phoneHash: varchar("phoneHash", { length: 64 }).unique(),
    phoneVerifiedAt: timestamp("phoneVerifiedAt"),
    phoneRevokedAt: timestamp("phoneRevokedAt"),
    avatar: text("avatar"),
    location: varchar("location", { length: 255 }),
    country: varchar("country", { length: 2 }),
    city: varchar("city", { length: 120 }),
    bio: text("bio"),
    role: mysqlEnum("role", ["user", "moderator", "admin", "super_admin"])
      .default("user")
      .notNull(),
    suspendedAt: timestamp("suspendedAt"),
    bannedAt: timestamp("bannedAt"),
    deletedAt: timestamp("deletedAt"),
    anonymizedAt: timestamp("anonymizedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
  },
  (table) => [
    index("users_role_idx").on(table.role),
    index("users_banned_at_idx").on(table.bannedAt),
    index("users_deleted_at_idx").on(table.deletedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userProfileLocations = mysqlTable(
  "user_profile_locations",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
    homeLocationId: bigint("homeLocationId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("user_profile_locations_home_idx").on(table.homeLocationId)],
);

export type UserProfileLocation = typeof userProfileLocations.$inferSelect;
export type InsertUserProfileLocation = typeof userProfileLocations.$inferInsert;

export const userBrowsePreferences = mysqlTable(
  "user_browse_preferences",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
    browseLocationId: bigint("browseLocationId", { mode: "number", unsigned: true }),
    radiusKm: int("radiusKm", { unsigned: true }).default(25).notNull(),
    includeDomesticShipping: boolean("includeDomesticShipping").default(true).notNull(),
    includeInternationalShipping: boolean("includeInternationalShipping")
      .default(false)
      .notNull(),
    locationSource: mysqlEnum("locationSource", [
      "manual_selection",
      "profile_default",
      "browser_geolocation",
      "ip_suggestion",
    ])
      .default("manual_selection")
      .notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("user_browse_preferences_location_idx").on(table.browseLocationId)],
);

export type UserBrowsePreference = typeof userBrowsePreferences.$inferSelect;
export type InsertUserBrowsePreference = typeof userBrowsePreferences.$inferInsert;

export const adminInvitations = mysqlTable(
  "admin_invitations",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    email: varchar("email", { length: 320 }).notNull(),
    role: mysqlEnum("role", ["moderator", "admin", "super_admin"]).notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"])
      .default("pending")
      .notNull(),
    invitedByUserId: bigint("invitedByUserId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    acceptedByUserId: bigint("acceptedByUserId", {
      mode: "number",
      unsigned: true,
    }),
    clerkInvitationId: varchar("clerkInvitationId", { length: 255 }),
    deliveryError: text("deliveryError"),
    expiresAt: timestamp("expiresAt"),
    acceptedAt: timestamp("acceptedAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("admin_invitations_email_status_idx").on(table.email, table.status),
    index("admin_invitations_inviter_idx").on(
      table.invitedByUserId,
      table.createdAt,
    ),
  ],
);

export type AdminInvitation = typeof adminInvitations.$inferSelect;
export type InsertAdminInvitation = typeof adminInvitations.$inferInsert;

export const categories = mysqlTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    parentId: bigint("parentId", { mode: "number", unsigned: true }),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    status: mysqlEnum("status", ["draft", "active", "inactive"])
      .default("draft")
      .notNull(),
    sortOrder: int("sortOrder", { unsigned: true }).default(0).notNull(),
    seoTitle: varchar("seoTitle", { length: 160 }),
    seoDescription: varchar("seoDescription", { length: 320 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("categories_parent_status_idx").on(table.parentId, table.status, table.sortOrder),
    index("categories_status_sort_idx").on(table.status, table.sortOrder),
  ],
);

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const locations = mysqlTable(
  "locations",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    sourceExternalId: varchar("sourceExternalId", { length: 32 }).unique(),
    placeType: mysqlEnum("placeType", ["country", "region", "city"]).notNull(),
    countryCode: varchar("countryCode", { length: 2 }).notNull(),
    regionCode: varchar("regionCode", { length: 20 }),
    cityName: varchar("cityName", { length: 200 }),
    normalizedCityName: varchar("normalizedCityName", { length: 200 }),
    asciiCityName: varchar("asciiCityName", { length: 200 }),
    latitude: double("latitude"),
    longitude: double("longitude"),
    geohash: varchar("geohash", { length: 12 }),
    population: int("population", { unsigned: true }).default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("locations_country_city_idx").on(table.countryCode, table.normalizedCityName),
    index("locations_city_idx").on(table.normalizedCityName),
    index("locations_ascii_idx").on(table.asciiCityName),
    index("locations_geohash_idx").on(table.geohash),
    index("locations_population_idx").on(table.population),
    index("locations_country_region_idx").on(table.countryCode, table.regionCode),
  ],
);

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

export const locationAliases = mysqlTable(
  "location_aliases",
  {
    id: serial("id").primaryKey(),
    locationId: bigint("locationId", { mode: "number", unsigned: true }).notNull(),
    alias: varchar("alias", { length: 200 }).notNull(),
    normalizedAlias: varchar("normalizedAlias", { length: 200 }).notNull(),
    languageCode: varchar("languageCode", { length: 10 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("location_aliases_location_idx").on(table.locationId),
    index("location_aliases_normalized_idx").on(table.normalizedAlias),
  ],
);

export type LocationAlias = typeof locationAliases.$inferSelect;
export type InsertLocationAlias = typeof locationAliases.$inferInsert;

export const marketConfigs = mysqlTable(
  "market_configs",
  {
    id: serial("id").primaryKey(),
    countryCode: varchar("countryCode", { length: 2 }).notNull().unique(),
    enabledForBrowsing: boolean("enabledForBrowsing").default(true).notNull(),
    enabledForListings: boolean("enabledForListings").default(true).notNull(),
    enabledForManualShipping: boolean("enabledForManualShipping").default(true).notNull(),
    enabledForProtectedPayments: boolean("enabledForProtectedPayments").default(false).notNull(),
    defaultCurrencyCode: varchar("defaultCurrencyCode", { length: 3 }).default("USD").notNull(),
    distanceUnit: mysqlEnum("distanceUnit", ["km", "mi"]).default("km").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("market_configs_browsing_idx").on(table.enabledForBrowsing)],
);

export type MarketConfig = typeof marketConfigs.$inferSelect;
export type InsertMarketConfig = typeof marketConfigs.$inferInsert;

export const books = mysqlTable(
  "books",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    author: varchar("author", { length: 255 }).notNull(),
    description: text("description"),
    categoryId: bigint("categoryId", { mode: "number", unsigned: true }),
    genre: varchar("genre", { length: 100 }).notNull(),
    condition: mysqlEnum("condition", [
      "likenew",
      "verygood",
      "good",
      "fair",
      "poor",
    ]).notNull(),
    isbn: varchar("isbn", { length: 20 }),
    language: varchar("language", { length: 50 }).default("English"),
    pages: int("pages", { unsigned: true }),
    transactionType: mysqlEnum("transactionType", [
      "swap",
      "giveaway",
      "sale",
    ]).notNull(),
    status: mysqlEnum("status", [
      "draft",
      "active",
      "reserved",
      "completed",
      "withdrawn",
      "suspended",
    ])
      .default("active")
      .notNull(),
    ownerId: bigint("ownerId", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    priceMinor: int("priceMinor", { unsigned: true }),
    shippingMinor: int("shippingMinor", { unsigned: true }).default(0).notNull(),
    country: varchar("country", { length: 2 }).default("US").notNull(),
    city: varchar("city", { length: 120 }).default("Unknown").notNull(),
    locationId: bigint("locationId", { mode: "number", unsigned: true }),
    pickupEnabled: boolean("pickupEnabled").default(false).notNull(),
    pickupRadiusKm: int("pickupRadiusKm", { unsigned: true }),
    manualShippingEnabled: boolean("manualShippingEnabled").default(false).notNull(),
    shippingScope: mysqlEnum("shippingScope", [
      "pickup_only",
      "domestic_only",
      "selected_countries",
      "worldwide",
    ])
      .default("pickup_only")
      .notNull(),
    locationPrecision: mysqlEnum("locationPrecision", ["city", "region", "country"])
      .default("city")
      .notNull(),
    educationLevel: varchar("educationLevel", { length: 80 }),
    schoolType: mysqlEnum("schoolType", ["public_school", "private_school", "not_applicable"]),
    pickupAvailable: boolean("pickupAvailable").default(false).notNull(),
    imageUrl: text("imageUrl"),
    imageUrls: json("imageUrls").$type<string[]>(),
    suspendedAt: timestamp("suspendedAt"),
    deletedAt: timestamp("deletedAt"),
    anonymizedAt: timestamp("anonymizedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("books_feed_idx").on(table.status, table.createdAt),
    index("books_owner_idx").on(table.ownerId, table.status, table.createdAt),
    index("books_geo_idx").on(table.country, table.city, table.status),
    index("books_mode_idx").on(table.transactionType, table.status, table.createdAt),
    index("books_category_idx").on(table.categoryId, table.status, table.createdAt),
    index("books_location_idx").on(table.locationId, table.status, table.createdAt),
    index("books_shipping_scope_idx").on(table.shippingScope, table.status),
    check(
      "books_sale_price_check",
      sql`(${table.transactionType} = 'sale' AND ${table.priceMinor} > 0) OR (${table.transactionType} <> 'sale' AND ${table.priceMinor} IS NULL)`,
    ),
  ],
);

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

export const listingImages = mysqlTable(
  "listing_images",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    bookId: bigint("bookId", { mode: "number", unsigned: true }).notNull(),
    blobUrl: text("blobUrl").notNull(),
    blobPath: varchar("blobPath", { length: 512 }).notNull(),
    sortOrder: int("sortOrder", { unsigned: true }).notNull(),
    contentType: varchar("contentType", { length: 100 }).notNull(),
    sizeBytes: int("sizeBytes", { unsigned: true }).notNull(),
    moderationStatus: mysqlEnum("moderationStatus", [
      "pending",
      "active",
      "rejected",
    ])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("listing_images_book_order_unique").on(
      table.bookId,
      table.sortOrder,
    ),
    index("listing_images_book_status_idx").on(
      table.bookId,
      table.moderationStatus,
    ),
  ],
);

export const listingShippingDestinations = mysqlTable(
  "listing_shipping_destinations",
  {
    id: serial("id").primaryKey(),
    listingId: bigint("listingId", { mode: "number", unsigned: true }).notNull(),
    countryCode: varchar("countryCode", { length: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("listing_shipping_dest_unique").on(table.listingId, table.countryCode),
    index("listing_shipping_dest_country_idx").on(table.countryCode),
  ],
);

export type ListingShippingDestination = typeof listingShippingDestinations.$inferSelect;
export type InsertListingShippingDestination = typeof listingShippingDestinations.$inferInsert;

export const uploadedAssets = mysqlTable(
  "uploaded_assets",
  {
    id: serial("id").primaryKey(),
    blobUrl: varchar("blobUrl", { length: 768 }).notNull().unique(),
    blobPath: varchar("blobPath", { length: 512 }).notNull(),
    uploaderPublicId: varchar("uploaderPublicId", { length: 36 }).notNull(),
    contentType: varchar("contentType", { length: 100 }).notNull(),
    sizeBytes: int("sizeBytes", { unsigned: true }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("uploaded_assets_uploader_idx").on(table.uploaderPublicId, table.createdAt)],
);

export const transactions = mysqlTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    idempotencyKey: varchar("idempotencyKey", { length: 80 }).notNull().unique(),
    bookId: bigint("bookId", { mode: "number", unsigned: true }).notNull(),
    requesterId: bigint("requesterId", { mode: "number", unsigned: true }).notNull(),
    ownerId: bigint("ownerId", { mode: "number", unsigned: true }).notNull(),
    offeredBookId: bigint("offeredBookId", {
      mode: "number",
      unsigned: true,
    }),
    type: mysqlEnum("type", [
      "swap_request",
      "giveaway_request",
      "sale_reservation",
    ]).notNull(),
    status: mysqlEnum("status", [
      "pending",
      "accepted",
      "completed",
      "declined",
      "cancelled",
      "expired",
    ])
      .default("pending")
      .notNull(),
    message: text("message"),
    priceMinor: int("priceMinor", { unsigned: true }),
    currency: varchar("currency", { length: 3 }),
    reservationExpiresAt: timestamp("reservationExpiresAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("transactions_owner_idx").on(table.ownerId, table.status, table.createdAt),
    index("transactions_requester_idx").on(
      table.requesterId,
      table.status,
      table.createdAt,
    ),
    index("transactions_book_idx").on(table.bookId, table.status),
    index("transactions_expiration_idx").on(
      table.status,
      table.reservationExpiresAt,
    ),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export const transactionEvents = mysqlTable(
  "transaction_events",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    transactionId: bigint("transactionId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    actorUserId: bigint("actorUserId", { mode: "number", unsigned: true }),
    type: varchar("type", { length: 80 }).notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("transaction_events_transaction_idx").on(
      table.transactionId,
      table.createdAt,
    ),
  ],
);

export const conversations = mysqlTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    participant1Id: bigint("participant1Id", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    participant2Id: bigint("participant2Id", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    bookId: bigint("bookId", { mode: "number", unsigned: true }).notNull(),
    subjectKey: varchar("subjectKey", { length: 120 }).notNull().unique(),
    lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("conversations_p1_idx").on(table.participant1Id, table.lastMessageAt),
    index("conversations_p2_idx").on(table.participant2Id, table.lastMessageAt),
    index("conversations_book_idx").on(table.bookId),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const messages = mysqlTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    conversationId: bigint("conversationId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    senderId: bigint("senderId", { mode: "number", unsigned: true }).notNull(),
    content: text("content").notNull(),
    flaggedAt: timestamp("flaggedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    readAt: timestamp("readAt"),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId, table.createdAt),
    index("messages_sender_idx").on(table.senderId, table.createdAt),
  ],
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const favorites = mysqlTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    bookId: bigint("bookId", { mode: "number", unsigned: true }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("favorites_user_book_unique").on(table.userId, table.bookId),
    index("favorites_book_idx").on(table.bookId),
  ],
);

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

export const reviews = mysqlTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    reviewerId: bigint("reviewerId", { mode: "number", unsigned: true }).notNull(),
    revieweeId: bigint("revieweeId", { mode: "number", unsigned: true }).notNull(),
    transactionId: bigint("transactionId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    rating: int("rating", { unsigned: true }).notNull(),
    comment: text("comment"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("reviews_transaction_reviewer_unique").on(
      table.transactionId,
      table.reviewerId,
    ),
    index("reviews_reviewee_idx").on(table.revieweeId, table.createdAt),
    check("reviews_rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
  ],
);

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

export const notifications = mysqlTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    type: varchar("type", { length: 80 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    link: varchar("link", { length: 512 }),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId, table.readAt, table.createdAt),
  ],
);

export const reports = mysqlTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    reporterId: bigint("reporterId", { mode: "number", unsigned: true }).notNull(),
    targetType: mysqlEnum("targetType", ["user", "listing", "message"]).notNull(),
    targetId: bigint("targetId", { mode: "number", unsigned: true }).notNull(),
    reason: varchar("reason", { length: 80 }).notNull(),
    details: text("details"),
    status: mysqlEnum("status", ["open", "reviewing", "resolved", "dismissed"])
      .default("open")
      .notNull(),
    assignedToId: bigint("assignedToId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("reports_queue_idx").on(table.status, table.createdAt),
    index("reports_target_idx").on(table.targetType, table.targetId),
  ],
);

export const moderationAuditLogs = mysqlTable(
  "moderation_audit_logs",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    actorUserId: bigint("actorUserId", { mode: "number", unsigned: true }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    targetType: varchar("targetType", { length: 80 }).notNull(),
    targetId: bigint("targetId", { mode: "number", unsigned: true }).notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("moderation_audit_target_idx").on(table.targetType, table.targetId),
    index("moderation_audit_actor_idx").on(table.actorUserId, table.createdAt),
  ],
);

export const identityAuditLogs = mysqlTable(
  "identity_audit_logs",
  {
    id: serial("id").primaryKey(),
    publicId: publicId().unique(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    type: varchar("type", { length: 80 }).notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("identity_audit_user_idx").on(table.userId, table.createdAt)],
);

export const outboxEvents = mysqlTable(
  "outbox_events",
  {
    id: serial("id").primaryKey(),
    eventId: varchar("eventId", { length: 36 })
      .notNull()
      .unique()
      .$defaultFn(() => randomUUID()),
    type: varchar("type", { length: 120 }).notNull(),
    aggregateType: varchar("aggregateType", { length: 80 }).notNull(),
    aggregateId: varchar("aggregateId", { length: 80 }).notNull(),
    version: int("version", { unsigned: true }).default(1).notNull(),
    payload: json("payload").$type<Record<string, unknown>>().notNull(),
    availableAt: timestamp("availableAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
    deadLetteredAt: timestamp("deadLetteredAt"),
    attempts: int("attempts", { unsigned: true }).default(0).notNull(),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("outbox_pending_idx").on(table.processedAt, table.deadLetteredAt, table.availableAt),
    index("outbox_aggregate_idx").on(table.aggregateType, table.aggregateId),
  ],
);

export const featureFlags = mysqlTable(
  "feature_flags",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 120 }).notNull(),
    country: varchar("country", { length: 2 }),
    enabled: boolean("enabled").default(false).notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("feature_flags_key_country_unique").on(table.key, table.country),
    index("feature_flags_country_idx").on(table.country, table.key),
  ],
);
