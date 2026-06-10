import { getMockAdminListing, getMockAdminListings } from "./mock-data";
import type {
  AdminListing,
  DuplicateStatus,
  ListingCondition,
  ListingFilters,
  ListingStatus,
  ListingType,
  ModerationStatus,
  PhotoFilter,
  RiskLevel,
  SchoolType,
  SellerType,
  SortDirection,
  SortKey,
} from "./types";

export const defaultListingFilters: ListingFilters = {
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
};

export const listingTypes: ListingType[] = ["sale", "swap", "giveaway"];
export const listingStatuses: ListingStatus[] = [
  "draft",
  "active",
  "reserved",
  "completed",
  "expired",
  "hidden",
  "removed",
];
export const moderationStatuses: ModerationStatus[] = [
  "normal",
  "flagged",
  "reported",
  "under_review",
  "removed",
];
export const riskLevels: RiskLevel[] = ["normal", "medium_risk", "high_risk"];
export const schoolTypes: SchoolType[] = [
  "public_school",
  "private_school",
  "not_applicable",
];
export const listingConditions: ListingCondition[] = [
  "likenew",
  "verygood",
  "good",
  "fair",
  "poor",
];
export const sellerTypes: SellerType[] = ["private_user", "bookstore", "pro_seller"];
export const photoFilters: PhotoFilter[] = ["has_photos", "missing_photos"];
export const duplicateStatuses: DuplicateStatus[] = [
  "not_checked",
  "possible_duplicate",
  "confirmed_duplicate",
  "allowed_multiple_quantity",
];

export function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatMoney(amountMinor: number | null, currencyCode: string) {
  if (amountMinor === null) return "Not applicable";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
  }).format(amountMinor / 100);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function uniqueValues(key: keyof AdminListing) {
  return [...new Set(getMockAdminListings().map((listing) => listing[key]))]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

function isWithinCreatedDate(createdAt: string, range: ListingFilters["createdDate"]) {
  if (range === "all") return true;
  const created = new Date(createdAt);
  const now = new Date();
  const start = new Date(now);
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "this_week") {
    start.setDate(now.getDate() - 7);
  } else {
    start.setMonth(now.getMonth() - 1);
  }
  return created >= start;
}

function matchesSearch(listing: AdminListing, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [
    listing.title,
    listing.author,
    listing.isbn,
    listing.id,
    listing.sellerName,
    listing.schoolName ?? "",
    listing.city,
    listing.country,
  ].some((value) => value.toLowerCase().includes(query));
}

export function filterAdminListings(listings: AdminListing[], filters: ListingFilters) {
  return listings.filter((listing) => {
    if (!matchesSearch(listing, filters.search)) return false;
    if (filters.listingType !== "all" && listing.listingType !== filters.listingType) return false;
    if (filters.listingStatus !== "all" && listing.listingStatus !== filters.listingStatus) return false;
    if (
      filters.moderationStatus !== "all" &&
      listing.moderationStatus !== filters.moderationStatus
    ) {
      return false;
    }
    if (filters.riskLevel !== "all" && listing.riskLevel !== filters.riskLevel) return false;
    if (filters.country !== "all" && listing.country !== filters.country) return false;
    if (filters.city !== "all" && listing.city !== filters.city) return false;
    if (filters.category !== "all" && listing.category !== filters.category) return false;
    if (filters.educationLevel !== "all" && listing.educationLevel !== filters.educationLevel) {
      return false;
    }
    if (filters.schoolType !== "all" && listing.schoolType !== filters.schoolType) return false;
    if (filters.subject !== "all" && listing.subject !== filters.subject) return false;
    if (filters.language !== "all" && listing.language !== filters.language) return false;
    if (filters.condition !== "all" && listing.condition !== filters.condition) return false;
    if (filters.sellerType !== "all" && listing.sellerType !== filters.sellerType) return false;
    if (!isWithinCreatedDate(listing.createdAt, filters.createdDate)) return false;
    if (filters.reportsCount === "has_reports" && listing.reportsCount === 0) return false;
    if (filters.reportsCount === "three_plus" && listing.reportsCount < 3) return false;
    if (filters.photos === "has_photos" && listing.imageUrls.length === 0) return false;
    if (filters.photos === "missing_photos" && listing.imageUrls.length > 0) return false;
    if (filters.duplicateStatus !== "all" && listing.duplicateStatus !== filters.duplicateStatus) {
      return false;
    }
    return true;
  });
}

export function sortAdminListings(
  listings: AdminListing[],
  sortKey: SortKey,
  sortDirection: SortDirection,
) {
  return [...listings].sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * multiplier;
    }
    return String(aValue).localeCompare(String(bValue)) * multiplier;
  });
}

export function getAdminListings() {
  return getMockAdminListings();
}

export function getAdminListing(listingId: string) {
  return getMockAdminListing(listingId);
}

export function getListingSummary(listings: AdminListing[]) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return {
    active: listings.filter((listing) => listing.listingStatus === "active").length,
    newThisWeek: listings.filter((listing) => new Date(listing.createdAt) >= weekAgo).length,
    sell: listings.filter((listing) => listing.listingType === "sale").length,
    swap: listings.filter((listing) => listing.listingType === "swap").length,
    giveaway: listings.filter((listing) => listing.listingType === "giveaway").length,
    flagged: listings.filter((listing) => listing.moderationStatus === "flagged").length,
    reported: listings.filter((listing) => listing.moderationStatus === "reported").length,
    removed: listings.filter((listing) => listing.listingStatus === "removed").length,
  };
}
