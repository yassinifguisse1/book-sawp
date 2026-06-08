import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./context";
import { appRouter } from "./router";

const anonymousContext = {
  auth: {
    userId: null,
  },
} as TrpcContext;

describe("appRouter", () => {
  it("keeps the health check public", async () => {
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.ping()).resolves.toEqual({
      ok: true,
      ts: expect.any(Number),
    });
  });

  it("rejects anonymous access to protected procedures", async () => {
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.auth.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
