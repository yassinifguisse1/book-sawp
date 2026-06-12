import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, isNull, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { z } from "zod";

import { bookPath } from "@/lib/slugs";
import { getDb } from "@/server/db/connection";
import { adminInvitations, books, categories, favorites, listingImages, moderationAuditLogs, notifications, reports, transactions, users } from "@/server/db/schema";
import {
  assertCanChangeStaffRole,
  canManageAdminTeam,
  normalizeInviteEmail,
  roleLabel,
} from "@/server/domain/admin-team";
import { listAdminLocations, setLocationActive } from "@/server/domain/admin-locations";
import { getPostByPublicId, listAllPosts } from "@/server/domain/posts";
import {
  accountStatusForUser,
  canModerateUser,
  moderationActionToAuditAction,
  moderationNotificationCopy,
  riskStatusFromReports,
  type AdminAccountStatus,
  type AdminModerationAction,
  type AdminRiskStatus,
  type AdminSellerType,
} from "@/server/domain/admin-users";
import {
  listMarketConfigs,
  setMarketEnabled,
  upsertMarketConfig,
} from "@/server/domain/markets";
import { scheduleOutboxProcessing, writeOutboxEvent } from "@/server/domain/outbox";
import {
  createCategory as createTaxonomyCategory,
  deleteUnusedCategory,
  listAdminCategoryTree,
  mergeCategory,
  setCategoryStatus,
  updateCategory,
} from "@/server/domain/taxonomy";
import { adminUpdateTransactionStatus } from "@/server/domain/transactions";
import { env } from "@/server/env";
import { createRouter, adminQuery, staffQuery, superAdminQuery } from "@/server/trpc";

async function countRows(query: Promise<Array<{ value: number }>>) {
  const [row] = await query;
  return Number(row?.value ?? 0);
}

const defaultAdminUserFilters = {
  query: "",
  accountStatus: "all",
  verification: "all",
  role: "all",
  country: "all",
  city: "all",
  joinedDate: "all",
  activity: "all",
  riskStatus: "all",
  sellerType: "all",
} as const;

const adminUserFiltersSchema = z
  .object({
    query: z.string().trim().default(""),
    accountStatus: z.enum(["all", "active", "suspended", "banned", "deleted"]).default("all"),
    verification: z
      .enum(["all", "email_verified", "phone_verified", "fully_verified", "not_verified"])
      .default("all"),
    role: z.enum(["all", "user", "moderator", "admin", "super_admin"]).default("all"),
    country: z.string().trim().default("all"),
    city: z.string().trim().default("all"),
    joinedDate: z.enum(["all", "today", "this_week", "this_month", "this_quarter"]).default("all"),
    activity: z.enum(["all", "has_listings", "has_transactions", "has_reports"]).default("all"),
    riskStatus: z.enum(["all", "normal", "flagged", "high_risk"]).default("all"),
    sellerType: z.enum(["all", "private_user", "bookstore", "pro_seller"]).default("all"),
  })
  .default(defaultAdminUserFilters);

const moderateUsersInput = z.object({
  userIds: z.array(z.number().int().positive()).min(1).max(100),
  action: z.enum(["warn", "suspend", "ban", "restore", "note"]),
  reason: z.string().trim().max(2000).optional(),
  duration: z.string().trim().max(80).optional(),
  notifyUser: z.boolean().default(false),
});

const listingFiltersSchema = z.object({
  search: z.string().trim().default(""),
  listingType: z.enum(["all", "sale", "swap", "giveaway"]).default("all"),
  listingStatus: z.enum(["all", "draft", "active", "reserved", "completed", "expired", "hidden", "removed"]).default("all"),
  moderationStatus: z.enum(["all", "normal", "flagged", "reported", "under_review", "removed"]).default("all"),
  riskLevel: z.enum(["all", "normal", "medium_risk", "high_risk"]).default("all"),
  country: z.string().trim().default("all"),
  city: z.string().trim().default("all"),
  category: z.string().trim().default("all"),
  educationLevel: z.string().trim().default("all"),
  schoolType: z.enum(["all", "public_school", "private_school", "not_applicable"]).default("all"),
  subject: z.string().trim().default("all"),
  language: z.string().trim().default("all"),
  condition: z.enum(["all", "likenew", "verygood", "good", "fair", "poor"]).default("all"),
  sellerType: z.enum(["all", "private_user", "bookstore", "pro_seller"]).default("all"),
  createdDate: z.enum(["all", "today", "this_week", "this_month"]).default("all"),
  reportsCount: z.enum(["all", "has_reports", "three_plus"]).default("all"),
  photos: z.enum(["all", "has_photos", "missing_photos"]).default("all"),
  duplicateStatus: z.enum(["all", "not_checked", "possible_duplicate", "confirmed_duplicate", "allowed_multiple_quantity"]).default("all"),
});

const defaultListingFilters = {
  search: "",
  listingType: "all",
  listingStatus: "all",
  moderationStatus: "all",
  riskLevel: "all",
  country: "all",
  city: "all",
  category: "all",
  educationLevel: "all",
  schoolType: "all",
  subject: "all",
  language: "all",
  condition: "all",
  sellerType: "all",
  createdDate: "all",
  reportsCount: "all",
  photos: "all",
  duplicateStatus: "all",
} as const;

const moderateListingsInput = z.object({
  listingIds: z.array(z.number().int().positive()).min(1).max(100),
  action: z.enum(["hide_listing", "remove_listing", "restore_listing", "flag_suspicious", "mark_reviewed"]),
  reason: z.string().trim().max(2000).optional(),
  internalNote: z.string().trim().max(2000).optional(),
  notifySeller: z.boolean().default(false),
});

const updateListingMetadataInput = z.object({
  listingId: z.number().int().positive(),
  title: z.string().trim().min(1).max(255).optional(),
  author: z.string().trim().min(1).max(255).optional(),
  categoryId: z.number().int().positive().optional(),
  genre: z.string().trim().min(1).max(100).optional(),
  language: z.string().trim().max(50).optional(),
  condition: z.enum(["likenew", "verygood", "good", "fair", "poor"]).optional(),
  isbn: z.string().trim().max(20).optional(),
  pages: z.number().int().positive().optional(),
});

const categoryStatusSchema = z.enum(["draft", "active", "inactive"]);

const createCategoryInput = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: z.number().int().positive().nullable().optional(),
  status: categoryStatusSchema.default("draft"),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  seoTitle: z.string().trim().max(160).nullable().optional(),
  seoDescription: z.string().trim().max(320).nullable().optional(),
});

const updateCategoryInput = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  seoTitle: z.string().trim().max(160).nullable().optional(),
  seoDescription: z.string().trim().max(320).nullable().optional(),
});

const setCategoryStatusInput = z.object({
  categoryId: z.number().int().positive(),
  status: categoryStatusSchema,
});

const mergeCategoryInput = z.object({
  sourceCategoryId: z.number().int().positive(),
  targetCategoryId: z.number().int().positive(),
});

const deleteCategoryInput = z.object({
  categoryId: z.number().int().positive(),
});

const marketUpsertInput = z.object({
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  enabledForBrowsing: z.boolean().optional(),
  enabledForListings: z.boolean().optional(),
  enabledForManualShipping: z.boolean().optional(),
  enabledForProtectedPayments: z.boolean().optional(),
  defaultCurrencyCode: z.string().regex(/^[A-Z]{3}$/).optional(),
  distanceUnit: z.enum(["km", "mi"]).optional(),
});

const marketSetEnabledInput = z.object({
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  field: z.enum([
    "enabledForBrowsing",
    "enabledForListings",
    "enabledForManualShipping",
    "enabledForProtectedPayments",
  ]),
  enabled: z.boolean(),
});

const adminLocationsInput = z.object({
  query: z.string().trim().max(80).optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  activeOnly: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

const setLocationActiveInput = z.object({
  locationId: z.number().int().positive(),
  isActive: z.boolean(),
});

const staffRoleSchema = z.enum(["moderator", "admin", "super_admin"]);

const inviteTeamMemberInput = z.object({
  email: z.string().trim().email().max(320),
  role: staffRoleSchema,
});

const revokeTeamInviteInput = z.object({
  invitationId: z.number().int().positive(),
});

const updateTeamMemberRoleInput = z.object({
  userId: z.number().int().positive(),
  role: staffRoleSchema,
});

const removeTeamMemberInput = z.object({
  userId: z.number().int().positive(),
});

type AdminUserRow = {
  id: number;
  fullName: string;
  avatarUrl: string;
  email: string;
  emailVerified: boolean;
  phoneMasked: string;
  phoneVerified: boolean;
  country: string;
  city: string;
  role: "user" | "moderator" | "admin" | "super_admin";
  sellerType: AdminSellerType;
  riskStatus: AdminRiskStatus;
  accountStatus: AdminAccountStatus;
  activeListingsCount: number;
  completedTransactionsCount: number;
  reportsReceivedCount: number;
  joinedAt: string;
  lastActiveAt: string;
};

type AdminListingRow = {
  id: string;
  numericId: number;
  publicId: string;
  title: string;
  author: string;
  isbn: string;
  edition: string;
  coverImageUrl: string | null;
  imageUrls: string[];
  listingType: "sale" | "swap" | "giveaway";
  priceAmountMinor: number | null;
  currencyCode: string;
  condition: "likenew" | "verygood" | "good" | "fair" | "poor";
  country: string;
  city: string;
  categoryId: number | null;
  categorySlug: string | null;
  category: string;
  educationLevel: string;
  grade: string;
  schoolType: "not_applicable";
  schoolName: string | null;
  subject: string;
  language: string;
  sellerId: string;
  sellerNumericId: number;
  sellerName: string;
  sellerType: "private_user";
  sellerVerified: boolean;
  listingStatus: "draft" | "active" | "reserved" | "completed" | "expired" | "hidden" | "removed";
  moderationStatus: "normal" | "flagged" | "reported" | "under_review" | "removed";
  riskLevel: "normal" | "medium_risk" | "high_risk";
  reportsCount: number;
  viewsCount: number;
  favoritesCount: number;
  reservationRequestsCount: number;
  duplicateStatus: "not_checked";
  safetyFlags: Array<{ id: string; ruleId: string; label: string; snippet: string; createdAt: string }>;
  description: string;
  deliveryOptions: string[];
  reports: Array<{
    id: string;
    reporter: string;
    reason: string;
    description: string;
    createdAt: string;
    status: string;
    assignedModerator: string;
    resolution: string;
  }>;
  moderationHistory: Array<{
    id: string;
    date: string;
    moderator: string;
    action: string;
    reason: string;
    internalNote: string;
    previousStatus: string;
    newStatus: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type AdminTeamMemberRow = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  role: "moderator" | "admin" | "super_admin";
  roleLabel: string;
  lastActiveAt: string;
  joinedAt: string;
  isOwner: boolean;
};

type AdminTeamInvitationRow = {
  id: number;
  email: string;
  role: "moderator" | "admin" | "super_admin";
  roleLabel: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedBy: string;
  clerkInvitationId: string | null;
  deliveryError: string | null;
  expiresAt: string | null;
  createdAt: string;
};

function increment(map: Map<number, number>, id: number | null | undefined, amount: number) {
  if (typeof id !== "number") return;
  map.set(id, (map.get(id) ?? 0) + amount);
}

function avatarFor(row: { avatar: string | null; name: string | null; publicId: string }) {
  return (
    row.avatar ??
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
      row.name ?? row.publicId,
    )}&backgroundColor=e6f3f4,dfe7fd,fff3e0,e8f5e9&textColor=007782,273444`
  );
}

function maskPhone(phoneVerifiedAt: Date | null) {
  return phoneVerifiedAt ? "Verified phone on file" : "No verified phone";
}

function startDateForJoinedFilter(filter: string) {
  const now = new Date();
  if (filter === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (filter === "this_week") {
    const date = new Date(now);
    date.setDate(now.getDate() - 7);
    return date;
  }
  if (filter === "this_month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (filter === "this_quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), quarterStartMonth, 1);
  }
  return null;
}

function matchesAdminUserFilters(user: AdminUserRow, filters: z.infer<typeof adminUserFiltersSchema>) {
  const query = filters.query.toLowerCase();
  if (query) {
    const haystack = [
      user.fullName,
      user.email,
      String(user.id),
      user.phoneMasked,
      user.country,
      user.city,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.accountStatus !== "all" && user.accountStatus !== filters.accountStatus) return false;
  if (filters.role !== "all" && user.role !== filters.role) return false;
  if (filters.country !== "all" && user.country !== filters.country) return false;
  if (filters.city !== "all" && user.city !== filters.city) return false;
  if (filters.riskStatus !== "all" && user.riskStatus !== filters.riskStatus) return false;
  if (filters.sellerType !== "all" && user.sellerType !== filters.sellerType) return false;
  if (filters.verification === "email_verified" && !user.emailVerified) return false;
  if (filters.verification === "phone_verified" && !user.phoneVerified) return false;
  if (filters.verification === "fully_verified" && (!user.emailVerified || !user.phoneVerified)) return false;
  if (filters.verification === "not_verified" && (user.emailVerified || user.phoneVerified)) return false;
  if (filters.activity === "has_listings" && user.activeListingsCount === 0) return false;
  if (filters.activity === "has_transactions" && user.completedTransactionsCount === 0) return false;
  if (filters.activity === "has_reports" && user.reportsReceivedCount === 0) return false;
  const joinedStart = startDateForJoinedFilter(filters.joinedDate);
  if (joinedStart && new Date(user.joinedAt) < joinedStart) return false;
  return true;
}

function sortAdminUsers(usersToSort: AdminUserRow[], sortKey: keyof AdminUserRow, direction: "asc" | "desc") {
  return [...usersToSort].sort((a, b) => {
    const first = a[sortKey];
    const second = b[sortKey];
    const result =
      typeof first === "number" && typeof second === "number"
        ? first - second
        : String(first).localeCompare(String(second));
    return direction === "asc" ? result : -result;
  });
}

function mapListingStatus(row: { status: string; deletedAt: Date | null; suspendedAt: Date | null }) {
  if (row.deletedAt) return "removed";
  if (row.suspendedAt || row.status === "suspended") return "hidden";
  if (row.status === "withdrawn") return "removed";
  return row.status === "draft" ||
    row.status === "active" ||
    row.status === "reserved" ||
    row.status === "completed"
    ? row.status
    : "active";
}

function moderationStatusForListing(
  listingStatus: AdminListingRow["listingStatus"],
  reportsCount: number,
  latestAuditAction?: string,
): AdminListingRow["moderationStatus"] {
  if (listingStatus === "removed") return "removed";
  if (listingStatus === "hidden") return "under_review";
  if (latestAuditAction === "listing.flagged") return "flagged";
  if (latestAuditAction === "listing.reviewed" || latestAuditAction === "listing.restored") return "normal";
  if (reportsCount > 0) return "reported";
  return "normal";
}

function riskLevelForListing(reportsCount: number, moderationStatus: AdminListingRow["moderationStatus"]) {
  if (reportsCount >= 3 || moderationStatus === "removed") return "high_risk";
  if (reportsCount > 0 || moderationStatus === "flagged" || moderationStatus === "under_review") return "medium_risk";
  return "normal";
}

function startDateForListingFilter(filter: string) {
  const now = new Date();
  if (filter === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "this_week") {
    const date = new Date(now);
    date.setDate(now.getDate() - 7);
    return date;
  }
  if (filter === "this_month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

function matchesListingFilters(listing: AdminListingRow, filters: z.infer<typeof listingFiltersSchema>) {
  const query = filters.search.toLowerCase();
  if (query) {
    const haystack = [
      listing.title,
      listing.author,
      listing.isbn,
      listing.id,
      String(listing.numericId),
      listing.sellerName,
      listing.city,
      listing.country,
      listing.category,
      listing.categorySlug ?? "",
      listing.subject,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.listingType !== "all" && listing.listingType !== filters.listingType) return false;
  if (filters.listingStatus !== "all" && listing.listingStatus !== filters.listingStatus) return false;
  if (filters.moderationStatus !== "all" && listing.moderationStatus !== filters.moderationStatus) return false;
  if (filters.riskLevel !== "all" && listing.riskLevel !== filters.riskLevel) return false;
  if (filters.country !== "all" && listing.country !== filters.country) return false;
  if (filters.city !== "all" && listing.city !== filters.city) return false;
  if (
    filters.category !== "all" &&
    listing.categorySlug !== filters.category &&
    listing.category !== filters.category
  ) {
    return false;
  }
  if (filters.educationLevel !== "all" && listing.educationLevel !== filters.educationLevel) return false;
  if (filters.schoolType !== "all" && listing.schoolType !== filters.schoolType) return false;
  if (filters.subject !== "all" && listing.subject !== filters.subject) return false;
  if (filters.language !== "all" && listing.language !== filters.language) return false;
  if (filters.condition !== "all" && listing.condition !== filters.condition) return false;
  if (filters.sellerType !== "all" && listing.sellerType !== filters.sellerType) return false;
  if (filters.reportsCount === "has_reports" && listing.reportsCount === 0) return false;
  if (filters.reportsCount === "three_plus" && listing.reportsCount < 3) return false;
  if (filters.photos === "has_photos" && listing.imageUrls.length === 0) return false;
  if (filters.photos === "missing_photos" && listing.imageUrls.length > 0) return false;
  if (filters.duplicateStatus !== "all" && listing.duplicateStatus !== filters.duplicateStatus) return false;
  const startDate = startDateForListingFilter(filters.createdDate);
  if (startDate && new Date(listing.createdAt) < startDate) return false;
  return true;
}

function sortAdminListings(
  rows: AdminListingRow[],
  sortKey: "createdAt" | "title" | "listingType" | "sellerName" | "reportsCount" | "riskLevel",
  direction: "asc" | "desc",
) {
  return [...rows].sort((a, b) => {
    const first = a[sortKey];
    const second = b[sortKey];
    const result =
      typeof first === "number" && typeof second === "number"
        ? first - second
        : String(first).localeCompare(String(second));
    return direction === "asc" ? result : -result;
  });
}

function summarizeListings(rows: AdminListingRow[]) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return {
    active: rows.filter((listing) => listing.listingStatus === "active").length,
    newThisWeek: rows.filter((listing) => new Date(listing.createdAt) >= weekAgo).length,
    sell: rows.filter((listing) => listing.listingType === "sale").length,
    swap: rows.filter((listing) => listing.listingType === "swap").length,
    giveaway: rows.filter((listing) => listing.listingType === "giveaway").length,
    flagged: rows.filter((listing) => listing.moderationStatus === "flagged").length,
    reported: rows.filter((listing) => listing.moderationStatus === "reported").length,
    removed: rows.filter((listing) => listing.listingStatus === "removed").length,
  };
}

function listingNotificationCopy(action: z.infer<typeof moderateListingsInput>["action"]) {
  const copy = {
    hide_listing: {
      title: "Your BookSwap listing is under review",
      body: "A BookSwap moderator hid your listing while it is reviewed.",
    },
    remove_listing: {
      title: "Your BookSwap listing was removed",
      body: "A BookSwap moderator removed your listing after review.",
    },
    restore_listing: {
      title: "Your BookSwap listing was restored",
      body: "Your listing has been restored and can appear in the marketplace again.",
    },
    flag_suspicious: {
      title: "Your BookSwap listing needs review",
      body: "A BookSwap moderator flagged your listing for additional review.",
    },
    mark_reviewed: {
      title: "Your BookSwap listing was reviewed",
      body: "A BookSwap moderator reviewed your listing.",
    },
  };
  return copy[action];
}

async function loadAdminListings() {
  const db = getDb();
  const [bookRows, imageRows, favoriteRows, transactionRows, reportRows, auditRows] = await Promise.all([
    db
      .select({
        id: books.id,
        publicId: books.publicId,
        title: books.title,
        author: books.author,
        description: books.description,
        categoryId: books.categoryId,
        categorySlug: categories.slug,
        categoryName: categories.name,
        genre: books.genre,
        condition: books.condition,
        isbn: books.isbn,
        language: books.language,
        pages: books.pages,
        transactionType: books.transactionType,
        status: books.status,
        ownerId: books.ownerId,
        currency: books.currency,
        priceMinor: books.priceMinor,
        country: books.country,
        city: books.city,
        pickupAvailable: books.pickupAvailable,
        imageUrl: books.imageUrl,
        imageUrls: books.imageUrls,
        suspendedAt: books.suspendedAt,
        deletedAt: books.deletedAt,
        createdAt: books.createdAt,
        updatedAt: books.updatedAt,
        ownerPublicId: users.publicId,
        ownerName: users.name,
        ownerEmailVerifiedAt: users.emailVerifiedAt,
        ownerPhoneVerifiedAt: users.phoneVerifiedAt,
      })
      .from(books)
      .leftJoin(users, eq(books.ownerId, users.id))
      .leftJoin(categories, eq(books.categoryId, categories.id))
      .limit(1000),
    db
      .select({ bookId: listingImages.bookId, blobUrl: listingImages.blobUrl, sortOrder: listingImages.sortOrder })
      .from(listingImages)
      .where(eq(listingImages.moderationStatus, "active")),
    db
      .select({ bookId: favorites.bookId, value: sql<number>`count(*)` })
      .from(favorites)
      .groupBy(favorites.bookId),
    db
      .select({ bookId: transactions.bookId, value: sql<number>`count(*)` })
      .from(transactions)
      .groupBy(transactions.bookId),
    db.select().from(reports).where(eq(reports.targetType, "listing")),
    db
      .select()
      .from(moderationAuditLogs)
      .where(eq(moderationAuditLogs.targetType, "listing"))
      .orderBy(desc(moderationAuditLogs.createdAt))
      .limit(1000),
  ]);

  const imagesByBook = new Map<number, string[]>();
  for (const row of imageRows.sort((a, b) => a.sortOrder - b.sortOrder)) {
    imagesByBook.set(row.bookId, [...(imagesByBook.get(row.bookId) ?? []), row.blobUrl]);
  }

  const favoritesByBook = new Map<number, number>();
  for (const row of favoriteRows) increment(favoritesByBook, row.bookId, Number(row.value));

  const transactionsByBook = new Map<number, number>();
  for (const row of transactionRows) increment(transactionsByBook, row.bookId, Number(row.value));

  const reportsByBook = new Map<number, typeof reportRows>();
  for (const row of reportRows) {
    reportsByBook.set(row.targetId, [...(reportsByBook.get(row.targetId) ?? []), row]);
  }

  const auditsByBook = new Map<number, typeof auditRows>();
  for (const row of auditRows) {
    auditsByBook.set(row.targetId, [...(auditsByBook.get(row.targetId) ?? []), row]);
  }

  return bookRows.map<AdminListingRow>((book) => {
    const auditHistory = auditsByBook.get(book.id) ?? [];
    const listingStatus = mapListingStatus(book);
    const reportsForBook = reportsByBook.get(book.id) ?? [];
    const latestAuditAction = auditHistory.at(0)?.action;
    const moderationStatus = moderationStatusForListing(listingStatus, reportsForBook.length, latestAuditAction);
    const imageUrls = imagesByBook.get(book.id) ?? book.imageUrls ?? (book.imageUrl ? [book.imageUrl] : []);
    return {
      id: String(book.id),
      numericId: book.id,
      publicId: book.publicId,
      title: book.title,
      author: book.author,
      isbn: book.isbn ?? "",
      edition: "",
      coverImageUrl: imageUrls.at(0) ?? book.imageUrl,
      imageUrls,
      listingType: book.transactionType,
      priceAmountMinor: book.priceMinor,
      currencyCode: book.currency,
      condition: book.condition,
      country: book.country,
      city: book.city,
      categoryId: book.categoryId,
      categorySlug: book.categorySlug,
      category: book.categoryName ?? book.genre,
      educationLevel: "Not specified",
      grade: "",
      schoolType: "not_applicable",
      schoolName: null,
      subject: book.categoryName ?? book.genre,
      language: book.language ?? "Unknown",
      sellerId: String(book.ownerId),
      sellerNumericId: book.ownerId,
      sellerName: book.ownerName ?? "BookSwap member",
      sellerType: "private_user",
      sellerVerified: Boolean(book.ownerEmailVerifiedAt && book.ownerPhoneVerifiedAt),
      listingStatus,
      moderationStatus,
      riskLevel: riskLevelForListing(reportsForBook.length, moderationStatus),
      reportsCount: reportsForBook.length,
      viewsCount: 0,
      favoritesCount: favoritesByBook.get(book.id) ?? 0,
      reservationRequestsCount: transactionsByBook.get(book.id) ?? 0,
      duplicateStatus: "not_checked",
      safetyFlags: [],
      description: book.description ?? "",
      deliveryOptions: [book.pickupAvailable ? "Pickup" : "Delivery"],
      reports: reportsForBook.map((report) => ({
        id: String(report.id),
        reporter: `User ${report.reporterId}`,
        reason: report.reason,
        description: report.details ?? "",
        createdAt: report.createdAt.toISOString(),
        status: report.status,
        assignedModerator: report.assignedToId ? `Admin ${report.assignedToId}` : "Unassigned",
        resolution: report.status === "resolved" || report.status === "dismissed" ? report.status : "",
      })),
      moderationHistory: auditHistory.map((entry) => ({
        id: String(entry.id),
        date: entry.createdAt.toISOString(),
        moderator: `Admin ${entry.actorUserId}`,
        action: entry.action,
        reason: typeof entry.metadata?.reason === "string" ? entry.metadata.reason : "",
        internalNote: typeof entry.metadata?.internalNote === "string" ? entry.metadata.internalNote : "",
        previousStatus: typeof entry.metadata?.previousStatus === "string" ? entry.metadata.previousStatus : "normal",
        newStatus: typeof entry.metadata?.newStatus === "string" ? entry.metadata.newStatus : moderationStatus,
      })),
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
    };
  });
}

async function loadAdminUsers() {
  const db = getDb();
  const [
    userRows,
    listingRows,
    transactionRequesterRows,
    transactionOwnerRows,
    reportRows,
  ] = await Promise.all([
    db.select().from(users).limit(1000),
    db
      .select({ ownerId: books.ownerId, value: sql<number>`count(*)` })
      .from(books)
      .where(and(eq(books.status, "active"), isNull(books.deletedAt)))
      .groupBy(books.ownerId),
    db
      .select({ userId: transactions.requesterId, value: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.status, "completed"))
      .groupBy(transactions.requesterId),
    db
      .select({ userId: transactions.ownerId, value: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.status, "completed"))
      .groupBy(transactions.ownerId),
    db
      .select({ targetId: reports.targetId, value: sql<number>`count(*)` })
      .from(reports)
      .where(eq(reports.targetType, "user"))
      .groupBy(reports.targetId),
  ]);

  const listingCounts = new Map<number, number>();
  for (const row of listingRows) increment(listingCounts, row.ownerId, Number(row.value));

  const transactionCounts = new Map<number, number>();
  for (const row of transactionRequesterRows) increment(transactionCounts, row.userId, Number(row.value));
  for (const row of transactionOwnerRows) increment(transactionCounts, row.userId, Number(row.value));

  const reportCounts = new Map<number, number>();
  for (const row of reportRows) increment(reportCounts, row.targetId, Number(row.value));

  return userRows.map<AdminUserRow>((user) => {
    const reportsReceivedCount = reportCounts.get(user.id) ?? 0;
    return {
      id: user.id,
      fullName: user.name ?? "BookSwap member",
      avatarUrl: avatarFor(user),
      email: user.email ?? "",
      emailVerified: Boolean(user.emailVerifiedAt),
      phoneMasked: maskPhone(user.phoneVerifiedAt),
      phoneVerified: Boolean(user.phoneVerifiedAt && !user.phoneRevokedAt),
      country: user.country ?? "Unknown",
      city: user.city ?? "Unknown",
      role: user.role,
      sellerType: "private_user",
      riskStatus: riskStatusFromReports(reportsReceivedCount),
      accountStatus: accountStatusForUser(user),
      activeListingsCount: listingCounts.get(user.id) ?? 0,
      completedTransactionsCount: transactionCounts.get(user.id) ?? 0,
      reportsReceivedCount,
      joinedAt: user.createdAt.toISOString(),
      lastActiveAt: user.lastSignInAt.toISOString(),
    };
  });
}

async function loadAdminTeam() {
  const db = getDb();
  const inviter = alias(users, "inviter");
  const [memberRows, invitationRows] = await Promise.all([
    db
      .select()
      .from(users)
      .where(and(inArray(users.role, ["moderator", "admin", "super_admin"]), isNull(users.deletedAt)))
      .orderBy(desc(users.role), desc(users.createdAt))
      .limit(500),
    db
      .select({
        id: adminInvitations.id,
        email: adminInvitations.email,
        role: adminInvitations.role,
        status: adminInvitations.status,
        clerkInvitationId: adminInvitations.clerkInvitationId,
        deliveryError: adminInvitations.deliveryError,
        expiresAt: adminInvitations.expiresAt,
        createdAt: adminInvitations.createdAt,
        invitedByName: inviter.name,
        invitedByEmail: inviter.email,
      })
      .from(adminInvitations)
      .leftJoin(inviter, eq(adminInvitations.invitedByUserId, inviter.id))
      .where(eq(adminInvitations.status, "pending"))
      .orderBy(desc(adminInvitations.createdAt))
      .limit(500),
  ]);

  const members = memberRows.map<AdminTeamMemberRow>((member) => ({
    id: member.id,
    name: member.name ?? "BookSwap staff",
    email: member.email ?? "",
    avatarUrl: avatarFor(member),
    role: member.role as AdminTeamMemberRow["role"],
    roleLabel: roleLabel(member.role),
    lastActiveAt: member.lastSignInAt.toISOString(),
    joinedAt: member.createdAt.toISOString(),
    isOwner: Boolean(env.ownerClerkUserId && member.clerkUserId === env.ownerClerkUserId),
  }));

  const invitations = invitationRows.map<AdminTeamInvitationRow>((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    roleLabel: roleLabel(invite.role),
    status: invite.status,
    invitedBy: invite.invitedByName ?? invite.invitedByEmail ?? "Unknown admin",
    clerkInvitationId: invite.clerkInvitationId,
    deliveryError: invite.deliveryError,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
  }));

  return {
    members,
    invitations,
    summary: {
      members: members.length,
      superAdmins: members.filter((member) => member.role === "super_admin").length,
      pendingInvites: invitations.length,
      deliveryIssues: invitations.filter((invite) => invite.deliveryError).length,
    },
  };
}

export const adminRouter = createRouter({
  dashboard: adminQuery.query(async () => {
    const db = getDb();
    const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      activeListings,
      reservations,
      completedExchanges,
      cancelledExchanges,
      openReports,
    ] = await Promise.all([
      countRows(
        db
          .select({ value: sql<number>`count(*)` })
          .from(users)
          .where(isNull(users.deletedAt)),
      ),
      countRows(
        db
          .select({ value: sql<number>`count(*)` })
          .from(users)
          .where(and(isNull(users.deletedAt), isNotNull(users.emailVerifiedAt))),
      ),
      countRows(
        db
          .select({ value: sql<number>`count(*)` })
          .from(users)
          .where(and(isNotNull(users.suspendedAt), isNull(users.bannedAt))),
      ),
      countRows(
        db
          .select({ value: sql<number>`count(*)` })
          .from(books)
          .where(and(eq(books.status, "active"), isNull(books.deletedAt))),
      ),
      countRows(
        db
          .select({ value: sql<number>`count(*)` })
          .from(books)
          .where(eq(books.status, "reserved")),
      ),
      countRows(
        db
          .select({ value: sql<number>`count(*)` })
          .from(transactions)
          .where(eq(transactions.status, "completed")),
      ),
      countRows(
        db
          .select({ value: sql<number>`count(*)` })
          .from(transactions)
          .where(eq(transactions.status, "cancelled")),
      ),
      countRows(
        db
          .select({ value: sql<number>`count(*)` })
          .from(reports)
          .where(eq(reports.status, "open")),
      ),
    ]);

    const listingsByTypeRows = await db
      .select({
        type: books.transactionType,
        value: sql<number>`count(*)`,
      })
      .from(books)
      .where(and(eq(books.status, "active"), isNull(books.deletedAt)))
      .groupBy(books.transactionType);

    const listingsByType = { sale: 0, swap: 0, giveaway: 0 };
    for (const row of listingsByTypeRows) {
      listingsByType[row.type] = Number(row.value);
    }

    const countryDistribution = await db
      .select({
        country: users.country,
        value: sql<number>`count(*)`,
      })
      .from(users)
      .where(and(isNull(users.deletedAt), isNotNull(users.country)))
      .groupBy(users.country)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const dailyUsers = await db
      .select({
        day: sql<string>`date(${users.createdAt})`,
        value: sql<number>`count(*)`,
      })
      .from(users)
      .where(gte(users.createdAt, sinceDate))
      .groupBy(sql`date(${users.createdAt})`)
      .orderBy(sql`date(${users.createdAt})`);

    const dailyListings = await db
      .select({
        day: sql<string>`date(${books.createdAt})`,
        value: sql<number>`count(*)`,
      })
      .from(books)
      .where(gte(books.createdAt, sinceDate))
      .groupBy(sql`date(${books.createdAt})`)
      .orderBy(sql`date(${books.createdAt})`);

    return {
      totals: {
        totalUsers,
        verifiedUsers,
        suspendedUsers,
        activeListings,
        reservations,
        completedExchanges,
        cancelledExchanges,
        openReports,
      },
      listingsByType,
      countryDistribution: countryDistribution.map((row) => ({
        country: row.country ?? "Unknown",
        count: Number(row.value),
      })),
      dailyActivity: {
        users: dailyUsers.map((row) => ({ day: row.day, count: Number(row.value) })),
        listings: dailyListings.map((row) => ({ day: row.day, count: Number(row.value) })),
      },
    };
  }),

  teamMembers: superAdminQuery.query(async () => loadAdminTeam()),

  inviteTeamMember: superAdminQuery
    .input(inviteTeamMemberInput)
    .mutation(async ({ ctx, input }) => {
      if (!canManageAdminTeam(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only super admins can manage the admin team." });
      }

      const db = getDb();
      const email = normalizeInviteEmail(input.email);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const existingUser = (
        await db.select().from(users).where(eq(users.email, email)).limit(1)
      ).at(0);

      if (existingUser) {
        try {
          await assertCanChangeStaffRole({
            actorUserId: ctx.user.id,
            targetUser: existingUser,
            nextRole: input.role,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "Unable to update team member role.",
          });
        }

        await db.transaction(async (tx) => {
          await tx.update(users).set({ role: input.role }).where(eq(users.id, existingUser.id));
          await tx.insert(moderationAuditLogs).values({
            actorUserId: ctx.user.id,
            action: "team.member_role_updated",
            targetType: "user",
            targetId: existingUser.id,
            metadata: {
              previousRole: existingUser.role,
              newRole: input.role,
              source: "admin_team_invite",
            },
          });
        });

        return { success: true, mode: "promoted_existing_user" as const };
      }

      const activeInvite = (
        await db
          .select()
          .from(adminInvitations)
          .where(and(eq(adminInvitations.email, email), eq(adminInvitations.status, "pending")))
          .limit(1)
      ).at(0);

      if (activeInvite && (!activeInvite.expiresAt || activeInvite.expiresAt > now)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A pending admin invite already exists for this email.",
        });
      }

      if (activeInvite?.expiresAt && activeInvite.expiresAt <= now) {
        await db
          .update(adminInvitations)
          .set({ status: "expired", updatedAt: now })
          .where(eq(adminInvitations.id, activeInvite.id));
      }

      const [createdInvite] = await db.insert(adminInvitations).values({
        email,
        role: input.role,
        status: "pending",
        invitedByUserId: ctx.user.id,
        expiresAt,
      });
      const invitationId = Number(createdInvite.insertId);

      await db.insert(moderationAuditLogs).values({
        actorUserId: ctx.user.id,
        action: "team.invite_created",
        targetType: "admin_invitation",
        targetId: invitationId,
        metadata: { email, role: input.role, expiresAt: expiresAt.toISOString() },
      });

      try {
        const client = await clerkClient();
        const clerkInvite = await client.invitations.createInvitation({
          emailAddress: email,
          expiresInDays: 14,
          notify: true,
          ignoreExisting: true,
          redirectUrl: `${env.appUrl}/admin`,
          publicMetadata: { bookswapAdminRole: input.role },
        });
        await db
          .update(adminInvitations)
          .set({ clerkInvitationId: clerkInvite.id, deliveryError: null })
          .where(eq(adminInvitations.id, invitationId));
      } catch (error) {
        await db
          .update(adminInvitations)
          .set({
            deliveryError:
              error instanceof Error ? error.message : "Clerk invitation delivery failed.",
          })
          .where(eq(adminInvitations.id, invitationId));
      }

      return { success: true, mode: "pending_invite" as const, invitationId };
    }),

  revokeTeamInvite: superAdminQuery
    .input(revokeTeamInviteInput)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const invite = (
        await db
          .select()
          .from(adminInvitations)
          .where(eq(adminInvitations.id, input.invitationId))
          .limit(1)
      ).at(0);

      if (!invite || invite.status !== "pending") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pending invite was not found." });
      }

      const now = new Date();
      await db.transaction(async (tx) => {
        await tx
          .update(adminInvitations)
          .set({ status: "revoked", revokedAt: now, updatedAt: now })
          .where(eq(adminInvitations.id, invite.id));
        await tx.insert(moderationAuditLogs).values({
          actorUserId: ctx.user.id,
          action: "team.invite_revoked",
          targetType: "admin_invitation",
          targetId: invite.id,
          metadata: { email: invite.email, role: invite.role },
        });
      });

      if (invite.clerkInvitationId) {
        try {
          const client = await clerkClient();
          await client.invitations.revokeInvitation(invite.clerkInvitationId);
        } catch {
          await db
            .update(adminInvitations)
            .set({ deliveryError: "Local invite was revoked, but Clerk invite revocation failed." })
            .where(eq(adminInvitations.id, invite.id));
        }
      }

      return { success: true };
    }),

  updateTeamMemberRole: superAdminQuery
    .input(updateTeamMemberRoleInput)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const targetUser = (
        await db.select().from(users).where(eq(users.id, input.userId)).limit(1)
      ).at(0);

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team member was not found." });
      }

      try {
        await assertCanChangeStaffRole({
          actorUserId: ctx.user.id,
          targetUser,
          nextRole: input.role,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unable to update team member role.",
        });
      }

      await db.transaction(async (tx) => {
        await tx.update(users).set({ role: input.role }).where(eq(users.id, targetUser.id));
        await tx.insert(moderationAuditLogs).values({
          actorUserId: ctx.user.id,
          action: "team.member_role_updated",
          targetType: "user",
          targetId: targetUser.id,
          metadata: { previousRole: targetUser.role, newRole: input.role },
        });
      });

      return { success: true };
    }),

  removeTeamMember: superAdminQuery
    .input(removeTeamMemberInput)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const targetUser = (
        await db.select().from(users).where(eq(users.id, input.userId)).limit(1)
      ).at(0);

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team member was not found." });
      }

      try {
        await assertCanChangeStaffRole({
          actorUserId: ctx.user.id,
          targetUser,
          nextRole: "user",
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unable to remove team member.",
        });
      }

      await db.transaction(async (tx) => {
        await tx.update(users).set({ role: "user" }).where(eq(users.id, targetUser.id));
        await tx.insert(moderationAuditLogs).values({
          actorUserId: ctx.user.id,
          action: "team.member_removed",
          targetType: "user",
          targetId: targetUser.id,
          metadata: { previousRole: targetUser.role, newRole: "user" },
        });
      });

      return { success: true };
    }),

  users: adminQuery
    .input(
      z
        .object({
          filters: adminUserFiltersSchema,
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(25),
          sortKey: z
            .enum([
              "fullName",
              "country",
              "activeListingsCount",
              "completedTransactionsCount",
              "reportsReceivedCount",
              "riskStatus",
              "accountStatus",
              "joinedAt",
            ])
            .default("joinedAt"),
          sortDirection: z.enum(["asc", "desc"]).default("desc"),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const allUsers = await loadAdminUsers();
      const filters = input?.filters ?? defaultAdminUserFilters;
      const parsedFilters = adminUserFiltersSchema.parse(filters);
      const filtered = allUsers.filter((user) => matchesAdminUserFilters(user, parsedFilters));
      const sorted = sortAdminUsers(filtered, input?.sortKey ?? "joinedAt", input?.sortDirection ?? "desc");
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 25;
      const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
      const safePage = Math.min(page, pageCount);
      const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      return {
        rows,
        total: filtered.length,
        page: safePage,
        pageCount,
        options: {
          countries: [...new Set(allUsers.map((user) => user.country))].sort(),
          cities: [...new Set(allUsers.map((user) => user.city))].sort(),
        },
        summary: {
          totalUsers: allUsers.length,
          fullyVerifiedUsers: allUsers.filter((user) => user.emailVerified && user.phoneVerified).length,
          newUsersThisWeek: allUsers.filter((user) => new Date(user.joinedAt) >= weekAgo).length,
          flaggedUsers: allUsers.filter((user) => user.riskStatus === "flagged" || user.riskStatus === "high_risk").length,
          suspendedUsers: allUsers.filter((user) => user.accountStatus === "suspended").length,
          bannedUsers: allUsers.filter((user) => user.accountStatus === "banned").length,
        },
      };
    }),

  userDetail: adminQuery
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const allUsers = await loadAdminUsers();
      const user = allUsers.find((row) => row.id === input.userId) ?? null;
      if (!user) return null;

      const history = await getDb()
        .select({
          id: moderationAuditLogs.id,
          action: moderationAuditLogs.action,
          actorUserId: moderationAuditLogs.actorUserId,
          metadata: moderationAuditLogs.metadata,
          createdAt: moderationAuditLogs.createdAt,
        })
        .from(moderationAuditLogs)
        .where(and(eq(moderationAuditLogs.targetType, "user"), eq(moderationAuditLogs.targetId, input.userId)))
        .orderBy(desc(moderationAuditLogs.createdAt))
        .limit(100);

      return {
        user,
        moderationHistory: history.map((row) => ({
          id: row.id,
          action: row.action,
          actor: `Admin ${row.actorUserId}`,
          note: typeof row.metadata?.reason === "string" ? row.metadata.reason : "",
          metadata: row.metadata ?? {},
          date: row.createdAt.toISOString(),
        })),
      };
    }),

  moderateUsers: adminQuery
    .input(moderateUsersInput)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const uniqueUserIds = [...new Set(input.userIds)];
      const now = new Date();
      const action = input.action as AdminModerationAction;
      const createdNotificationIds: number[] = [];
      let affected = 0;

      await db.transaction(async (tx) => {
        const targetUsers = await tx
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(inArray(users.id, uniqueUserIds));
        const authorizedUserIds = targetUsers
          .filter((target) => canModerateUser(ctx.user, target))
          .map((target) => target.id);

        if (authorizedUserIds.length !== uniqueUserIds.length) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot moderate one or more selected accounts.",
          });
        }
        affected = authorizedUserIds.length;

        if (action === "suspend") {
          await tx.update(users).set({ suspendedAt: now, bannedAt: null }).where(inArray(users.id, authorizedUserIds));
        } else if (action === "ban") {
          await tx.update(users).set({ bannedAt: now, suspendedAt: null }).where(inArray(users.id, authorizedUserIds));
        } else if (action === "restore") {
          await tx.update(users).set({ bannedAt: null, suspendedAt: null }).where(inArray(users.id, authorizedUserIds));
        }

        for (const targetId of authorizedUserIds) {
          await tx.insert(moderationAuditLogs).values({
            actorUserId: ctx.user.id,
            action: moderationActionToAuditAction(action),
            targetType: "user",
            targetId,
            metadata: {
              reason: input.reason,
              notifyUser: input.notifyUser,
              duration: input.duration,
            },
          });

          if (input.notifyUser && (action === "warn" || action === "suspend" || action === "ban")) {
            const copy = moderationNotificationCopy(action);
            const [notification] = await tx.insert(notifications).values({
              userId: targetId,
              type: `moderation.${action}`,
              title: copy.title,
              body: copy.body,
              link: "/notifications",
            });
            const notificationId = Number(notification.insertId);
            createdNotificationIds.push(notificationId);
            await writeOutboxEvent(tx, {
              type: "notification.created",
              aggregateType: "notification",
              aggregateId: notificationId,
              payload: { notificationId, userId: targetId },
            });
          }
        }
      });

      if (createdNotificationIds.length > 0) {
        await scheduleOutboxProcessing();
      }
      return { success: true, affected };
    }),

  revealUserPhone: adminQuery
    .input(
      z.object({
        userId: z.number().int().positive(),
        reason: z.string().trim().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [target] = await db
        .select({
          id: users.id,
          role: users.role,
          phoneVerifiedAt: users.phoneVerifiedAt,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!target || target.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      if (!canModerateUser(ctx.user, target)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot reveal this user's phone.",
        });
      }

      await db.insert(moderationAuditLogs).values({
        actorUserId: ctx.user.id,
        action: "user.phone_revealed",
        targetType: "user",
        targetId: input.userId,
        metadata: { reason: input.reason },
      });

      return { phoneMasked: maskPhone(target.phoneVerifiedAt) };
    }),

  listings: adminQuery
    .input(
      z
        .object({
          filters: listingFiltersSchema.default(defaultListingFilters),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(25),
          sortKey: z.enum(["createdAt", "title", "listingType", "sellerName", "reportsCount", "riskLevel"]).default("createdAt"),
          sortDirection: z.enum(["asc", "desc"]).default("desc"),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const allListings = await loadAdminListings();
      const filters = listingFiltersSchema.parse(input?.filters ?? defaultListingFilters);
      const filtered = allListings.filter((listing) => matchesListingFilters(listing, filters));
      const sorted = sortAdminListings(filtered, input?.sortKey ?? "createdAt", input?.sortDirection ?? "desc");
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 25;
      const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
      const safePage = Math.min(page, pageCount);
      const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
      return {
        rows,
        total: filtered.length,
        page: safePage,
        pageCount,
        summary: summarizeListings(allListings),
        options: {
          countries: [...new Set(allListings.map((listing) => listing.country))].sort(),
          cities: [...new Set(allListings.map((listing) => listing.city))].sort(),
          categories: [...new Set(allListings.map((listing) => listing.categorySlug ?? listing.category))].sort(),
          educationLevels: [...new Set(allListings.map((listing) => listing.educationLevel))].sort(),
          subjects: [...new Set(allListings.map((listing) => listing.subject))].sort(),
          languages: [...new Set(allListings.map((listing) => listing.language))].sort(),
        },
      };
    }),

  listingDetail: adminQuery
    .input(z.object({ listingId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const listings = await loadAdminListings();
      return listings.find((listing) => listing.numericId === input.listingId) ?? null;
    }),

  moderateListings: adminQuery
    .input(moderateListingsInput)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const listingIds = [...new Set(input.listingIds)];
      const now = new Date();
      const createdNotificationIds: number[] = [];
      const sellerRows = await db
        .select({
          listingId: books.id,
          ownerId: books.ownerId,
          status: books.status,
          title: books.title,
          publicId: books.publicId,
        })
        .from(books)
        .where(inArray(books.id, listingIds));
      const sellerByListing = new Map(sellerRows.map((row) => [row.listingId, row]));

      await db.transaction(async (tx) => {
        const updateValues =
          input.action === "hide_listing"
            ? { status: "suspended" as const, suspendedAt: now }
            : input.action === "remove_listing"
              ? { status: "withdrawn" as const, deletedAt: now }
              : input.action === "restore_listing"
                ? { status: "active" as const, suspendedAt: null, deletedAt: null }
                : null;

        if (updateValues) {
          await tx.update(books).set(updateValues).where(inArray(books.id, listingIds));
        }

        for (const listingId of listingIds) {
          const previousStatus = sellerByListing.get(listingId)?.status ?? "unknown";
          const actionMap = {
            hide_listing: "listing.hidden",
            remove_listing: "listing.removed",
            restore_listing: "listing.restored",
            flag_suspicious: "listing.flagged",
            mark_reviewed: "listing.reviewed",
          };
          await tx.insert(moderationAuditLogs).values({
            actorUserId: ctx.user.id,
            action: actionMap[input.action],
            targetType: "listing",
            targetId: listingId,
            metadata: {
              reason: input.reason,
              internalNote: input.internalNote,
              notifySeller: input.notifySeller,
              previousStatus,
              newStatus:
                input.action === "hide_listing"
                  ? "hidden"
                  : input.action === "remove_listing"
                    ? "removed"
                    : input.action === "restore_listing"
                      ? "active"
                      : input.action === "flag_suspicious"
                        ? "flagged"
                        : "normal",
            },
          });

          const listing = sellerByListing.get(listingId);
          const ownerId = listing?.ownerId;
          if (input.notifySeller && ownerId && listing) {
            const copy = listingNotificationCopy(input.action);
            const [notification] = await tx.insert(notifications).values({
              userId: ownerId,
              type: `listing.${input.action}`,
              title: copy.title,
              body: copy.body,
              link: bookPath({ title: listing.title, publicId: listing.publicId }),
            });
            const notificationId = Number(notification.insertId);
            createdNotificationIds.push(notificationId);
            await writeOutboxEvent(tx, {
              type: "notification.created",
              aggregateType: "notification",
              aggregateId: notificationId,
              payload: { notificationId, userId: ownerId },
            });
          }

          if (input.action === "hide_listing" || input.action === "remove_listing" || input.action === "restore_listing") {
            await writeOutboxEvent(tx, {
              type:
                input.action === "restore_listing"
                  ? "listing.updated"
                  : input.action === "remove_listing"
                    ? "listing.withdrawn"
                    : "listing.suspended",
              aggregateType: "listing",
              aggregateId: listingId,
              payload: { listingId },
            });
          }
        }
      });

      if (createdNotificationIds.length > 0 || ["hide_listing", "remove_listing", "restore_listing"].includes(input.action)) {
        await scheduleOutboxProcessing();
      }
      return { success: true, affected: listingIds.length };
    }),

  updateListingMetadata: adminQuery
    .input(updateListingMetadataInput)
    .mutation(async ({ ctx, input }) => {
      const { listingId, ...updates } = input;
      const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));
      await getDb().transaction(async (tx) => {
        if (Object.keys(safeUpdates).length > 0) {
          await tx.update(books).set(safeUpdates).where(eq(books.id, listingId));
        }
        await tx.insert(moderationAuditLogs).values({
          actorUserId: ctx.user.id,
          action: "listing.metadata_updated",
          targetType: "listing",
          targetId: listingId,
          metadata: { updates: Object.keys(safeUpdates) },
        });
        await writeOutboxEvent(tx, {
          type: "listing.updated",
          aggregateType: "listing",
          aggregateId: listingId,
          payload: { listingId },
        });
      });
      await scheduleOutboxProcessing();
      return { success: true };
    }),

  transactions: adminQuery
    .input(
      z
        .object({
          status: z
            .enum(["pending", "accepted", "completed", "declined", "cancelled", "expired"])
            .optional(),
          type: z
            .enum(["swap_request", "giveaway_request", "sale_reservation"])
            .optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const requester = alias(users, "requester");
      const owner = alias(users, "owner");
      const offeredBook = alias(books, "offeredBook");
      const conditions = [];
      if (input?.status) conditions.push(eq(transactions.status, input.status));
      if (input?.type) conditions.push(eq(transactions.type, input.type));

      const rows = await db
        .select({
          id: transactions.id,
          publicId: transactions.publicId,
          type: transactions.type,
          status: transactions.status,
          message: transactions.message,
          priceMinor: transactions.priceMinor,
          currency: transactions.currency,
          reservationExpiresAt: transactions.reservationExpiresAt,
          completedAt: transactions.completedAt,
          createdAt: transactions.createdAt,
          updatedAt: transactions.updatedAt,
          bookId: books.id,
          bookPublicId: books.publicId,
          bookTitle: books.title,
          bookAuthor: books.author,
          bookStatus: books.status,
          bookTransactionType: books.transactionType,
          requesterId: requester.id,
          requesterPublicId: requester.publicId,
          requesterName: requester.name,
          requesterEmail: requester.email,
          ownerId: owner.id,
          ownerPublicId: owner.publicId,
          ownerName: owner.name,
          ownerEmail: owner.email,
          offeredBookId: offeredBook.id,
          offeredBookTitle: offeredBook.title,
          offeredBookStatus: offeredBook.status,
        })
        .from(transactions)
        .leftJoin(books, eq(transactions.bookId, books.id))
        .leftJoin(requester, eq(transactions.requesterId, requester.id))
        .leftJoin(owner, eq(transactions.ownerId, owner.id))
        .leftJoin(offeredBook, eq(transactions.offeredBookId, offeredBook.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(transactions.createdAt))
        .limit(input?.limit ?? 50);

      return rows.map((row) => ({
        ...row,
        price: row.priceMinor == null ? null : row.priceMinor / 100,
      }));
    }),

  updateTransaction: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["completed", "cancelled"]),
        message: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      adminUpdateTransactionStatus({
        actorId: ctx.user.id,
        transactionId: input.id,
        status: input.status,
        message: input.message,
      }),
    ),

  taxonomy: createRouter({
    categories: adminQuery.query(() => listAdminCategoryTree()),
    createCategory: adminQuery
      .input(createCategoryInput)
      .mutation(({ ctx, input }) =>
        createTaxonomyCategory({ actorUserId: ctx.user.id, ...input }),
      ),
    updateCategory: adminQuery
      .input(updateCategoryInput)
      .mutation(({ ctx, input }) => updateCategory({ actorUserId: ctx.user.id, ...input })),
    setCategoryStatus: adminQuery
      .input(setCategoryStatusInput)
      .mutation(({ ctx, input }) => setCategoryStatus({ actorUserId: ctx.user.id, ...input })),
    mergeCategory: adminQuery
      .input(mergeCategoryInput)
      .mutation(({ ctx, input }) => mergeCategory({ actorUserId: ctx.user.id, ...input })),
    deleteCategory: adminQuery
      .input(deleteCategoryInput)
      .mutation(({ ctx, input }) => deleteUnusedCategory({ actorUserId: ctx.user.id, ...input })),
  }),

  markets: createRouter({
    list: adminQuery.query(() => listMarketConfigs()),
    upsert: adminQuery.input(marketUpsertInput).mutation(async ({ ctx, input }) => {
      const market = await upsertMarketConfig(input);
      await getDb().insert(moderationAuditLogs).values({
        actorUserId: ctx.user.id,
        action: "taxonomy.market_upserted",
        targetType: "market",
        targetId: market?.id ?? 0,
        metadata: { countryCode: input.countryCode },
      });
      return market;
    }),
    setEnabled: adminQuery.input(marketSetEnabledInput).mutation(async ({ ctx, input }) => {
      await setMarketEnabled(input.countryCode, input.field, input.enabled);
      await getDb().insert(moderationAuditLogs).values({
        actorUserId: ctx.user.id,
        action: "taxonomy.market_flag_updated",
        targetType: "market",
        targetId: 0,
        metadata: { countryCode: input.countryCode, field: input.field, enabled: input.enabled },
      });
      return { success: true };
    }),
  }),

  locations: createRouter({
    list: adminQuery.input(adminLocationsInput).query(({ input }) => listAdminLocations(input)),
    setActive: adminQuery
      .input(setLocationActiveInput)
      .mutation(({ ctx, input }) => setLocationActive({ actorUserId: ctx.user.id, ...input })),
  }),

  blog: createRouter({
    list: staffQuery
      .input(
        z.object({
          status: z.enum(["all", "draft", "published", "archived"]).default("all"),
          query: z.string().trim().default(""),
          limit: z.number().int().min(1).max(100).default(25),
          offset: z.number().int().min(0).default(0),
        })
      )
      .query(({ input }) => listAllPosts(input)),
    byPublicId: staffQuery
      .input(z.object({ publicId: z.string().uuid() }))
      .query(({ input }) => getPostByPublicId(input.publicId)),
  }),
});
