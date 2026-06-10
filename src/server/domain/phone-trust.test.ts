import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/env", () => ({
  env: {
    phoneHmacKey: "test-phone-hmac-key",
  },
}));

import {
  assertVerifiedPhoneStorageOnly,
  buildVerifiedPhoneStorage,
  hashVerifiedPhone,
  normalizeE164Phone,
  verifyPhoneHmac,
} from "@/server/domain/phone-trust";

describe("verified phone HMAC storage", () => {
  const samplePhone = "+33624184700";

  it("normalizes verified E.164 numbers", () => {
    expect(normalizeE164Phone("+33 6 24 18 47 00")).toBe(samplePhone);
  });

  it("stores only a keyed HMAC digest, never the raw number", () => {
    const storage = buildVerifiedPhoneStorage(samplePhone);

    expect(storage.phoneHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storage.phoneHash).not.toBe(samplePhone);
    expect(JSON.stringify(storage)).not.toContain(samplePhone);
    expect(storage.phoneRevokedAt).toBeNull();
    expect(storage.phoneVerifiedAt).toBeInstanceOf(Date);
  });

  it("produces stable hashes for the same number and distinct hashes for different numbers", () => {
    const first = hashVerifiedPhone(samplePhone);
    const second = hashVerifiedPhone(samplePhone);
    const other = hashVerifiedPhone("+14155552671");

    expect(first).toBe(second);
    expect(other).not.toBe(first);
  });

  it("compares stored hashes with timingSafeEqual semantics", () => {
    const storage = buildVerifiedPhoneStorage(samplePhone);

    expect(verifyPhoneHmac(samplePhone, storage.phoneHash)).toBe(true);
    expect(verifyPhoneHmac("+14155552671", storage.phoneHash)).toBe(false);
  });

  it("rejects persistence payloads that include raw phone values", () => {
    expect(() =>
      assertVerifiedPhoneStorageOnly({
        phoneHash: "+33624184700",
        phoneVerifiedAt: new Date(),
        phoneRevokedAt: null,
      }),
    ).toThrow("Raw E.164 phone numbers must not be persisted.");

    expect(() =>
      assertVerifiedPhoneStorageOnly({
        phoneNumber: "+33624184700",
      }),
    ).toThrow("Unexpected verified-phone storage field: phoneNumber");
  });
});
