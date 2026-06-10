import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";

import { getDb } from "@/server/db/connection";
import { users } from "@/server/db/schema";
import { env } from "@/server/env";

const PHONE_HASH_ALGORITHM = "sha256";

export const VERIFIED_PHONE_STORAGE_KEYS = [
  "phoneHash",
  "phoneVerifiedAt",
  "phoneRevokedAt",
] as const;

export type VerifiedPhoneStorageUpdate = {
  phoneHash: string;
  phoneVerifiedAt: Date;
  phoneRevokedAt: null;
};

const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export function normalizeE164Phone(phone: string) {
  const normalized = phone.trim().replace(/[\s-]/g, "");
  if (!E164_PATTERN.test(normalized)) {
    throw new Error("Phone number must be verified E.164 format.");
  }
  return normalized;
}

function phoneHmacKey() {
  const key = env.phoneHmacKey;
  if (!key) {
    throw new Error("PHONE_HMAC_KEY is not configured.");
  }
  return key;
}

export function hashVerifiedPhone(e164Phone: string) {
  const e164 = normalizeE164Phone(e164Phone);
  return createHmac(PHONE_HASH_ALGORITHM, phoneHmacKey()).update(e164).digest("hex");
}

export function verifyPhoneHmac(e164Phone: string, storedHash: string) {
  const expected = hashVerifiedPhone(e164Phone);
  if (expected.length !== storedHash.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(storedHash));
}

export function buildVerifiedPhoneStorage(
  e164Phone: string,
  verifiedAt = new Date(),
): VerifiedPhoneStorageUpdate {
  return {
    phoneHash: hashVerifiedPhone(e164Phone),
    phoneVerifiedAt: verifiedAt,
    phoneRevokedAt: null,
  };
}

export function assertVerifiedPhoneStorageOnly(values: Record<string, unknown>) {
  for (const key of Object.keys(values)) {
    if (!VERIFIED_PHONE_STORAGE_KEYS.includes(key as (typeof VERIFIED_PHONE_STORAGE_KEYS)[number])) {
      throw new Error(`Unexpected verified-phone storage field: ${key}`);
    }
    const value = values[key];
    if (typeof value === "string" && E164_PATTERN.test(value.replace(/[\s-]/g, ""))) {
      throw new Error("Raw E.164 phone numbers must not be persisted.");
    }
  }
}

export async function saveVerifiedPhone(userId: number, e164Phone: string) {
  const storage = buildVerifiedPhoneStorage(e164Phone);
  assertVerifiedPhoneStorageOnly(storage);

  await getDb().update(users).set(storage).where(eq(users.id, userId));
  return storage;
}

export async function markPhoneVerified(userId: number, e164Phone: string) {
  return saveVerifiedPhone(userId, e164Phone);
}
