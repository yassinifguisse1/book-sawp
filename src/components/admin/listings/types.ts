export type ListingType = "sale" | "swap" | "giveaway";
export type ListingStatus =
  | "draft"
  | "active"
  | "reserved"
  | "completed"
  | "expired"
  | "hidden"
  | "removed";
export type ModerationStatus = "normal" | "flagged" | "reported" | "under_review" | "removed";
export type RiskLevel = "normal" | "medium_risk" | "high_risk";
export type SchoolType = "public_school" | "private_school" | "not_applicable";
export type ListingCondition = "likenew" | "verygood" | "good" | "fair" | "poor";
export type SellerType = "private_user" | "bookstore" | "pro_seller";
export type PhotoFilter = "has_photos" | "missing_photos";
export type DuplicateStatus =
  | "not_checked"
  | "possible_duplicate"
  | "confirmed_duplicate"
  | "allowed_multiple_quantity";
export type SafetyRuleId =
  | "external_payment_request"
  | "suspicious_link"
  | "phone_number_in_description"
  | "duplicate_content"
  | "duplicate_image"
  | "unusual_listing_volume"
  | "price_outlier"
  | "reported_multiple_times";
export type ReportReason =
  | "scam_attempt"
  | "misleading_description"
  | "wrong_book_details"
  | "wrong_edition"
  | "wrong_language"
  | "missing_pages_not_disclosed"
  | "duplicate_listing"
  | "prohibited_content"
  | "spam"
  | "external_payment_pressure"
  | "other";

export type SafetyFlag = {
  id: string;
  ruleId: SafetyRuleId | string;
  label: string;
  snippet: string;
  createdAt: string;
};

export type ListingReport = {
  id: string;
  reporter: string;
  reason: ReportReason | string;
  description: string;
  createdAt: string;
  status: "open" | "reviewing" | "under_review" | "resolved" | "dismissed" | string;
  assignedModerator: string;
  resolution: string;
};

export type ModerationHistoryEntry = {
  id: string;
  date: string;
  moderator: string;
  action: string;
  reason: string;
  internalNote: string;
  previousStatus: ListingStatus | ModerationStatus | string;
  newStatus: ListingStatus | ModerationStatus | string;
};

export type AdminListing = {
  id: string;
  numericId?: number;
  publicId?: string;
  title: string;
  author: string;
  isbn: string;
  edition: string;
  coverImageUrl: string | null;
  imageUrls: string[];
  listingType: ListingType;
  priceAmountMinor: number | null;
  currencyCode: string;
  condition: ListingCondition;
  country: string;
  city: string;
  category: string;
  educationLevel: string;
  grade: string;
  schoolType: SchoolType;
  schoolName: string | null;
  subject: string;
  language: string;
  sellerId: string;
  sellerNumericId?: number;
  sellerName: string;
  sellerType: SellerType;
  sellerVerified: boolean;
  listingStatus: ListingStatus;
  moderationStatus: ModerationStatus;
  riskLevel: RiskLevel;
  reportsCount: number;
  viewsCount: number;
  favoritesCount: number;
  reservationRequestsCount: number;
  duplicateStatus: DuplicateStatus;
  safetyFlags: SafetyFlag[];
  description: string;
  deliveryOptions: string[];
  reports: ListingReport[];
  moderationHistory: ModerationHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type ListingFilters = {
  search: string;
  listingType: ListingType | "all";
  listingStatus: ListingStatus | "all";
  moderationStatus: ModerationStatus | "all";
  riskLevel: RiskLevel | "all";
  country: string;
  city: string;
  category: string;
  educationLevel: string;
  schoolType: SchoolType | "all";
  subject: string;
  language: string;
  condition: ListingCondition | "all";
  sellerType: SellerType | "all";
  createdDate: "all" | "today" | "this_week" | "this_month";
  reportsCount: "all" | "has_reports" | "three_plus";
  photos: PhotoFilter | "all";
  duplicateStatus: DuplicateStatus | "all";
};

export type SortKey =
  | "createdAt"
  | "title"
  | "listingType"
  | "sellerName"
  | "reportsCount"
  | "riskLevel";

export type SortDirection = "asc" | "desc";

export type ListingAction =
  | "view_details"
  | "edit_metadata"
  | "hide_listing"
  | "remove_listing"
  | "restore_listing"
  | "flag_suspicious"
  | "mark_reviewed"
  | "view_seller_profile"
  | "assign_moderator"
  | "export_selected";
