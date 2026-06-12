import { describe, expect, it } from "vitest";

import { resolveSupportEmail } from "@/lib/support-email";

describe("resolveSupportEmail", () => {
  it("accepts a real support address", () => {
    expect(resolveSupportEmail("support@bookswap.app")).toBe("support@bookswap.app");
  });

  it("rejects placeholder example addresses", () => {
    expect(resolveSupportEmail("support@bookswap.example")).toBeNull();
    expect(resolveSupportEmail("notifications@example.com")).toBeNull();
  });

  it("rejects empty and malformed values", () => {
    expect(resolveSupportEmail("")).toBeNull();
    expect(resolveSupportEmail("not-an-email")).toBeNull();
  });
});
