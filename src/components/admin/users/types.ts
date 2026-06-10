export type AdminUserRole = "user" | "moderator" | "admin" | "super_admin";

export type AccountStatus = "active" | "suspended" | "banned" | "deleted";

export type RiskStatus = "normal" | "flagged" | "high_risk";

export type SellerType = "private_user" | "bookstore" | "pro_seller";

export type VerificationFilter =
  | "all"
  | "email_verified"
  | "phone_verified"
  | "fully_verified"
  | "not_verified";

export type ActivityFilter = "all" | "has_listings" | "has_transactions" | "has_reports";

export type JoinedDateFilter = "all" | "today" | "this_week" | "this_month" | "this_quarter";

export type AdminUser = {
  id: number;
  fullName: string;
  avatarUrl: string;
  email: string;
  emailVerified: boolean;
  phoneMasked: string;
  phoneVerified: boolean;
  country: string;
  city: string;
  role: AdminUserRole;
  sellerType: SellerType;
  riskStatus: RiskStatus;
  accountStatus: AccountStatus;
  activeListingsCount: number;
  completedTransactionsCount: number;
  reportsReceivedCount: number;
  joinedAt: string;
  lastActiveAt: string;
};

export type UserAction =
  | "view_profile"
  | "warn"
  | "suspend"
  | "ban"
  | "restore"
  | "add_note"
  | "reveal_phone"
  | "export_csv";

const roleRank: Record<AdminUserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

const actionMinimumRole: Record<UserAction, AdminUserRole> = {
  view_profile: "moderator",
  warn: "moderator",
  suspend: "admin",
  ban: "admin",
  restore: "admin",
  add_note: "moderator",
  reveal_phone: "admin",
  export_csv: "admin",
};

export function canPerformUserAction(role: AdminUserRole, action: UserAction) {
  return roleRank[role] >= roleRank[actionMinimumRole[action]];
}

