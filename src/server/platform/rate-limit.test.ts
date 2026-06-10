import { describe, expect, it, vi } from "vitest";

// Must mock env before importing rate-limit module
vi.mock("@/server/env", () => ({
  env: {
    rateLimitBypass: true,
  },
}));

vi.mock("@/server/platform/cache", () => ({
  getRedis: vi.fn(),
}));

import { assertPublicRateLimit, assertSensitiveRateLimit } from "@/server/platform/rate-limit";

describe("rate-limit bypass hardening", () => {
  it("assertPublicRateLimit respects RATE_LIMIT_BYPASS", async () => {
    // Should return immediately without throwing
    await expect(
      assertPublicRateLimit("test", "ip:1", { requests: 10, window: "1 m" }),
    ).resolves.toBeUndefined();
  });

  it("assertSensitiveRateLimit ignores RATE_LIMIT_BYPASS in production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");

    // Even with rateLimitBypass=true, in production it should attempt to use Redis
    // Since getRedis returns undefined in the mock, it should throw
    await expect(
      assertSensitiveRateLimit("listing.publish", { userId: 1, ipAddress: "1.2.3.4" }),
    ).rejects.toThrow("Rate limit storage is unavailable");

    vi.stubEnv("NODE_ENV", originalNodeEnv);
  });

  it("assertSensitiveRateLimit bypasses in non-production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "development");

    await expect(
      assertSensitiveRateLimit("listing.publish", { userId: 1, ipAddress: "1.2.3.4" }),
    ).resolves.toBeUndefined();

    vi.stubEnv("NODE_ENV", originalNodeEnv);
  });
});
