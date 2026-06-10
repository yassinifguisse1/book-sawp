import { and, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/server/db/connection";
import { adminInvitations, users, type User } from "@/server/db/schema";

export const staffRoles = ["moderator", "admin", "super_admin"] as const;
export const manageableStaffRoles = ["moderator", "admin", "super_admin"] as const;

export type StaffRole = (typeof staffRoles)[number];
export type ManageableStaffRole = (typeof manageableStaffRoles)[number];

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function roleLabel(role: User["role"]) {
  const labels: Record<User["role"], string> = {
    user: "Customer",
    moderator: "Moderator",
    admin: "Admin",
    super_admin: "Super Admin",
  };
  return labels[role];
}

export function isStaffRole(role: string): role is StaffRole {
  return staffRoles.includes(role as StaffRole);
}

export function canAccessAdminPanel(user: Pick<User, "role" | "deletedAt">) {
  return !user.deletedAt && isStaffRole(user.role);
}

export function canManageAdminTeam(user: Pick<User, "role" | "deletedAt">) {
  return !user.deletedAt && user.role === "super_admin";
}

export async function countActiveSuperAdmins() {
  const [row] = await getDb()
    .select({ value: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.role, "super_admin"), isNull(users.deletedAt)));

  return Number(row?.value ?? 0);
}

export async function assertCanChangeStaffRole({
  actorUserId,
  targetUser,
  nextRole,
}: {
  actorUserId: number;
  targetUser: Pick<User, "id" | "role" | "deletedAt">;
  nextRole: User["role"];
}) {
  if (targetUser.deletedAt) {
    throw new Error("Deleted users cannot be managed as staff members.");
  }

  if (actorUserId === targetUser.id && nextRole !== "super_admin") {
    throw new Error("You cannot remove your own super admin access.");
  }

  if (targetUser.role === "super_admin" && nextRole !== "super_admin") {
    const superAdminCount = await countActiveSuperAdmins();
    if (superAdminCount <= 1) {
      throw new Error("At least one super admin must remain.");
    }
  }
}

export async function applyPendingAdminInvitationForUser(user: User) {
  if (!user.email || user.deletedAt) return user;

  const email = normalizeInviteEmail(user.email);
  const now = new Date();
  const pendingInvite = (
    await getDb()
      .select()
      .from(adminInvitations)
      .where(and(eq(adminInvitations.email, email), eq(adminInvitations.status, "pending")))
      .orderBy(adminInvitations.createdAt)
      .limit(1)
  ).at(0);

  if (!pendingInvite) return user;

  if (pendingInvite.expiresAt && pendingInvite.expiresAt <= now) {
    await getDb()
      .update(adminInvitations)
      .set({ status: "expired", updatedAt: now })
      .where(eq(adminInvitations.id, pendingInvite.id));
    return user;
  }

  await getDb().transaction(async (tx) => {
    await tx
      .update(users)
      .set({ role: pendingInvite.role })
      .where(eq(users.id, user.id));
    await tx
      .update(adminInvitations)
      .set({
        status: "accepted",
        acceptedByUserId: user.id,
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(adminInvitations.id, pendingInvite.id));
  });

  return { ...user, role: pendingInvite.role };
}
