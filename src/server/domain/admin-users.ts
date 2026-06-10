import type { User } from "@/server/db/schema";

const roleRank: Record<User["role"], number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

export type AdminAccountStatus = "active" | "suspended" | "banned" | "deleted";
export type AdminRiskStatus = "normal" | "flagged" | "high_risk";
export type AdminSellerType = "private_user" | "bookstore" | "pro_seller";
export type AdminModerationAction = "warn" | "suspend" | "ban" | "restore" | "note";

export function accountStatusForUser(
  user: Pick<User, "deletedAt" | "bannedAt" | "suspendedAt">,
): AdminAccountStatus {
  if (user.deletedAt) return "deleted";
  if (user.bannedAt) return "banned";
  if (user.suspendedAt) return "suspended";
  return "active";
}

export function riskStatusFromReports(reportsReceivedCount: number): AdminRiskStatus {
  if (reportsReceivedCount >= 5) return "high_risk";
  if (reportsReceivedCount > 0) return "flagged";
  return "normal";
}

export function canPerformMarketplaceAction(
  user: Pick<User, "deletedAt" | "bannedAt" | "suspendedAt">,
) {
  return !user.deletedAt && !user.bannedAt && !user.suspendedAt;
}

export function hasRequiredTrustLevel(
  user: Pick<User, "emailVerifiedAt" | "phoneVerifiedAt" | "phoneRevokedAt">,
) {
  return !!user.emailVerifiedAt && !!user.phoneVerifiedAt && !user.phoneRevokedAt;
}

export function canModerateUser(
  actor: Pick<User, "id" | "role">,
  target: Pick<User, "id" | "role">,
) {
  if (actor.id === target.id) return false;
  return roleRank[target.role] < roleRank[actor.role];
}

export function moderationActionToAuditAction(action: AdminModerationAction) {
  const names: Record<AdminModerationAction, string> = {
    warn: "user.warned",
    suspend: "user.suspended",
    ban: "user.banned",
    restore: "user.restored",
    note: "user.note_added",
  };
  return names[action];
}

export function moderationNotificationCopy(action: Exclude<AdminModerationAction, "note" | "restore">) {
  const copy: Record<Exclude<AdminModerationAction, "note" | "restore">, { title: string; body: string }> = {
    warn: {
      title: "A policy warning was added to your BookSwap account",
      body: "A BookSwap moderator reviewed your account activity and added a policy warning. Please keep marketplace activity aligned with BookSwap rules.",
    },
    suspend: {
      title: "Your BookSwap account has been suspended",
      body: "Your BookSwap account has been suspended from marketplace actions. Contact support if you believe this was a mistake.",
    },
    ban: {
      title: "Your BookSwap account has been banned",
      body: "Your BookSwap account has been banned from marketplace use after staff review.",
    },
  };
  return copy[action];
}
