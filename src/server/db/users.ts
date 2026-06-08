import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { env } from "@/server/env";
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
    values.role = "admin";
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

  return user;
}

export async function resolveLocalUser(clerkUserId: string) {
  return (
    (await findUserByClerkUserId(clerkUserId)) ??
    (await refreshLocalUser(clerkUserId))
  );
}
