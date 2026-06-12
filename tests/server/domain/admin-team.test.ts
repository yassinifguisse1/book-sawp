import { describe, expect, it } from "vitest";

import {
  canAccessAdminPanel,
  canManageAdminTeam,
  isStaffRole,
  normalizeInviteEmail,
  roleLabel,
} from "@/server/domain/admin-team";

describe("admin team role helpers", () => {
  it("labels the marketplace user role as Customer", () => {
    expect(roleLabel("user")).toBe("Customer");
    expect(roleLabel("moderator")).toBe("Moderator");
    expect(roleLabel("admin")).toBe("Admin");
    expect(roleLabel("super_admin")).toBe("Super Admin");
  });

  it("allows staff roles and blocks customers from admin access", () => {
    expect(isStaffRole("user")).toBe(false);
    expect(isStaffRole("moderator")).toBe(true);
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("super_admin")).toBe(true);
    expect(canAccessAdminPanel({ role: "user", deletedAt: null })).toBe(false);
    expect(canAccessAdminPanel({ role: "admin", deletedAt: null })).toBe(true);
    expect(canAccessAdminPanel({ role: "super_admin", deletedAt: new Date() })).toBe(false);
  });

  it("limits team management to active super admins", () => {
    expect(canManageAdminTeam({ role: "admin", deletedAt: null })).toBe(false);
    expect(canManageAdminTeam({ role: "super_admin", deletedAt: null })).toBe(true);
    expect(canManageAdminTeam({ role: "super_admin", deletedAt: new Date() })).toBe(false);
  });

  it("normalizes invite emails before persistence", () => {
    expect(normalizeInviteEmail(" Staff@Example.COM ")).toBe("staff@example.com");
  });
});
