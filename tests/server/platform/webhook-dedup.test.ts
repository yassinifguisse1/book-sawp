import { beforeEach, describe, expect, it, vi } from "vitest";

const redisSet = vi.fn();
const redisDel = vi.fn();

vi.mock("@/server/platform/cache", () => ({
  getRedis: () => ({
    set: redisSet,
    del: redisDel,
  }),
  deleteCache: async (...keys: string[]) => {
    await redisDel(...keys.map((key) => `bookswap:${key}`));
  },
}));

vi.mock("@/server/env", () => ({
  env: {
    cacheNamespace: "bookswap",
  },
}));

import {
  claimClerkWebhookEvent,
  releaseClerkWebhookEvent,
} from "@/server/platform/webhook-dedup";

describe("clerk webhook dedup", () => {
  beforeEach(() => {
    redisSet.mockReset();
    redisDel.mockReset();
  });

  it("claims a new webhook event id", async () => {
    redisSet.mockResolvedValue("OK");

    await expect(claimClerkWebhookEvent("msg_123")).resolves.toBe("claimed");
    expect(redisSet).toHaveBeenCalledWith(
      "bookswap:webhook:clerk:msg_123",
      "1",
      expect.objectContaining({ nx: true }),
    );
  });

  it("treats an existing webhook event id as a duplicate", async () => {
    redisSet.mockResolvedValue(null);

    await expect(claimClerkWebhookEvent("msg_123")).resolves.toBe("duplicate");
  });

  it("releases a claimed webhook event id after failure", async () => {
    await releaseClerkWebhookEvent("msg_123");

    expect(redisDel).toHaveBeenCalledWith("bookswap:webhook:clerk:msg_123");
  });
});
