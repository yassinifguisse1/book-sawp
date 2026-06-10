import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { env } from "@/server/env";
import { applyPendingAdminInvitationForUser } from "@/server/domain/admin-team";
import { getDb } from "./connection";
import { users, type InsertUser } from "./schema";

export async function findUserByClerkUserId(clerkUserId: string) {
  const rows = await getDb()
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  return rows.at(0);
}

export async function refreshLocalUser(clerkUserId: string) {
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  const primaryEmail =
    clerkUser.primaryEmailAddress ?? clerkUser.emailAddresses.at(0) ?? null;
  const fullName = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ");

  const values: InsertUser = {
    clerkUserId,
    name:
      fullName ||
      clerkUser.username ||
      primaryEmail?.emailAddress ||
      "BookSwap member",
    email: primaryEmail?.emailAddress ?? null,
    emailVerifiedAt:
      primaryEmail?.verification?.status === "verified" ? new Date() : null,
    avatar: clerkUser.imageUrl,
    lastSignInAt: new Date(),
  };

  if (clerkUserId === env.ownerClerkUserId) {
    values.role = "super_admin";
  }

  await getDb()
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        name: values.name,
        email: values.email,
        emailVerifiedAt: values.emailVerifiedAt,
        avatar: values.avatar,
        lastSignInAt: values.lastSignInAt,
        ...(values.role ? { role: values.role } : {}),
      },
    });

  const user = await findUserByClerkUserId(clerkUserId);
  if (!user) {
    throw new Error("Failed to create local BookSwap user");
  }

  if (clerkUserId === env.ownerClerkUserId) {
    return user;
  }

  return applyPendingAdminInvitationForUser(user);
}

export async function resolveLocalUser(clerkUserId: string) {
  return (
    (await findUserByClerkUserId(clerkUserId)) ??
    (await refreshLocalUser(clerkUserId))
  );
}

type ClerkWebhookUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{
    id: string;
    email_address: string;
    verification?: { status?: string | null } | null;
  }>;
};

export async function upsertUserFromWebhook(data: ClerkWebhookUser) {
  const clerkUserId = data.id;
  const emails = data.email_addresses ?? [];
  const primaryEmail =
    emails.find((email) => email.id === data.primary_email_address_id) ??
    emails.at(0) ??
    null;
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");

  const values: InsertUser = {
    clerkUserId,
    name:
      fullName ||
      data.username ||
      primaryEmail?.email_address ||
      "BookSwap member",
    email: primaryEmail?.email_address ?? null,
    emailVerifiedAt:
      primaryEmail?.verification?.status === "verified" ? new Date() : null,
    avatar: data.image_url ?? null,
  };

  if (clerkUserId === env.ownerClerkUserId) {
    values.role = "super_admin";
  }

  await getDb()
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        name: values.name,
        email: values.email,
        emailVerifiedAt: values.emailVerifiedAt,
        avatar: values.avatar,
        ...(values.role ? { role: values.role } : {}),
      },
    });

  const user = await findUserByClerkUserId(clerkUserId);
  if (!user || clerkUserId === env.ownerClerkUserId) {
    return user;
  }

  return applyPendingAdminInvitationForUser(user);
}

export async function softDeleteUserByClerkId(clerkUserId: string) {
  await getDb()
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.clerkUserId, clerkUserId));
}
