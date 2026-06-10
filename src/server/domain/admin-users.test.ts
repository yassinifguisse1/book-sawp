import { beforeEach, describe, expect, it } from "vitest";

import {
  accountStatusForUser,
  canModerateUser,
  canPerformMarketplaceAction,
  hasRequiredTrustLevel,
  moderationActionToAuditAction,
  moderationNotificationCopy,
  riskStatusFromReports,
} from "@/server/domain/admin-users";

describe("admin user status helpers", () => {
  it("prioritizes deleted, banned, suspended, then active account status", () => {
    const active = { deletedAt: null, bannedAt: null, suspendedAt: null };
    const suspended = { deletedAt: null, bannedAt: null, suspendedAt: new Date() };
    const banned = { deletedAt: null, bannedAt: new Date(), suspendedAt: new Date() };
    const deleted = { deletedAt: new Date(), bannedAt: new Date(), suspendedAt: new Date() };

    expect(accountStatusForUser(active)).toBe("active");
    expect(accountStatusForUser(suspended)).toBe("suspended");
    expect(accountStatusForUser(banned)).toBe("banned");
    expect(accountStatusForUser(deleted)).toBe("deleted");
  });

  it("blocks marketplace actions for suspended, banned, and deleted users", () => {
    expect(canPerformMarketplaceAction({ deletedAt: null, bannedAt: null, suspendedAt: null })).toBe(true);
    expect(canPerformMarketplaceAction({ deletedAt: null, bannedAt: null, suspendedAt: new Date() })).toBe(false);
    expect(canPerformMarketplaceAction({ deletedAt: null, bannedAt: new Date(), suspendedAt: null })).toBe(false);
    expect(canPerformMarketplaceAction({ deletedAt: new Date(), bannedAt: null, suspendedAt: null })).toBe(false);
  });

  it("allows moderation only for lower-ranked accounts", () => {
    const superAdmin = { id: 1, role: "super_admin" as const };
    const admin = { id: 2, role: "admin" as const };
    const moderator = { id: 3, role: "moderator" as const };
    const customer = { id: 4, role: "user" as const };

    expect(canModerateUser(superAdmin, admin)).toBe(true);
    expect(canModerateUser(superAdmin, superAdmin)).toBe(false);
    expect(canModerateUser(admin, moderator)).toBe(true);
    expect(canModerateUser(admin, admin)).toBe(false);
    expect(canModerateUser(admin, superAdmin)).toBe(false);
    expect(canModerateUser(admin, customer)).toBe(true);
  });

  it("derives risk and audit labels consistently", () => {
    expect(riskStatusFromReports(0)).toBe("normal");
    expect(riskStatusFromReports(1)).toBe("flagged");
    expect(riskStatusFromReports(5)).toBe("high_risk");
    expect(moderationActionToAuditAction("ban")).toBe("user.banned");
    expect(moderationNotificationCopy("warn").title).toContain("policy warning");
  });

  it("requires email verified, phone verified, and phone not revoked for trust", () => {
    const base = { emailVerifiedAt: null as Date | null, phoneVerifiedAt: null as Date | null, phoneRevokedAt: null as Date | null };

    expect(hasRequiredTrustLevel({ ...base, emailVerifiedAt: new Date(), phoneVerifiedAt: new Date() })).toBe(true);
    expect(hasRequiredTrustLevel({ ...base, emailVerifiedAt: new Date(), phoneVerifiedAt: new Date(), phoneRevokedAt: new Date() })).toBe(false);
    expect(hasRequiredTrustLevel({ ...base, emailVerifiedAt: null, phoneVerifiedAt: new Date() })).toBe(false);
    expect(hasRequiredTrustLevel({ ...base, emailVerifiedAt: new Date(), phoneVerifiedAt: null })).toBe(false);
    expect(hasRequiredTrustLevel({ ...base, emailVerifiedAt: null, phoneVerifiedAt: null })).toBe(false);
  });
});
