import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "@/server/context";

type InsertCall = { table: unknown; value: Record<string, unknown> };
const insertCalls: InsertCall[] = [];
const selectQueue: unknown[][] = [];

function nextSelectResult() {
  return selectQueue.shift() ?? [];
}

function fakeLimit() {
  return { limit: async () => nextSelectResult() };
}

function fakeWhere() {
  return {
    where: () => fakeLimit(),
    limit: async () => nextSelectResult(),
    leftJoin: () => fakeWhere(),
    orderBy: () => fakeWhere(),
    groupBy: () => fakeWhere(),
  };
}

function fakeFrom() {
  return {
    from: () => fakeWhere(),
    where: () => fakeLimit(),
    leftJoin: () => fakeWhere(),
    orderBy: () => fakeWhere(),
    groupBy: () => fakeWhere(),
    innerJoin: () => fakeWhere(),
  };
}

vi.mock("@/server/db/connection", () => ({
  getDb: () => ({
    select: () => fakeFrom(),
    insert: () => ({
      values: async (value: Record<string, unknown>) => {
        insertCalls.push({ table: "table", value });
        return [{ insertId: 101 }];
      },
    }),
    update: () => ({
      set: () => ({
        where: async () => undefined,
      }),
    }),
    transaction: async (callback: (tx: { insert: typeof fakeInsert }) => Promise<unknown>) =>
      callback({ insert: fakeInsert }),
  }),
}));

function fakeInsert(table: unknown) {
  return {
    values: async (value: Record<string, unknown>) => {
      insertCalls.push({ table, value });
      return [{ insertId: 101 }];
    },
  };
}

vi.mock("@/server/db/users", () => ({
  resolveLocalUser: async () => ({
    id: 1,
    role: "user",
    deletedAt: null,
    bannedAt: null,
    suspendedAt: null,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: new Date(),
    phoneRevokedAt: null,
  }),
}));

vi.mock("@/server/domain/outbox", () => ({
  scheduleOutboxProcessing: vi.fn(),
  writeOutboxEvent: vi.fn(),
}));

vi.mock("@/server/platform/rate-limit", () => ({
  assertSensitiveRateLimit: vi.fn(),
}));

import { appRouter } from "@/server/router";

const context = {
  auth: { userId: "user_clerk_id" },
  ipAddress: "127.0.0.1",
  requestId: "test-request",
} as TrpcContext;

describe("moderation report validation", () => {
  beforeEach(() => {
    insertCalls.length = 0;
    selectQueue.length = 0;
  });

  it("rejects self-reports", async () => {
    const caller = appRouter.createCaller(context);

    await expect(
      caller.moderation.report({
        targetType: "user",
        targetId: 1, // same as reporter
        reason: "Spam",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("yourself"),
    });
  });

  it("rejects reports for non-existent users", async () => {
    const caller = appRouter.createCaller(context);
    selectQueue.push([]); // user not found

    await expect(
      caller.moderation.report({
        targetType: "user",
        targetId: 999,
        reason: "Spam",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("not found"),
    });
  });

  it("rejects reports for deleted listings", async () => {
    const caller = appRouter.createCaller(context);
    selectQueue.push([]); // listing not found (deleted)

    await expect(
      caller.moderation.report({
        targetType: "listing",
        targetId: 999,
        reason: "Scam",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("not found"),
    });
  });

  it("rejects message reports from non-participants", async () => {
    const caller = appRouter.createCaller(context);
    selectQueue.push(
      [{ conversationId: 5 }], // message exists
      [{ participant1Id: 10, participant2Id: 20 }], // conversation without reporter
    );

    await expect(
      caller.moderation.report({
        targetType: "message",
        targetId: 42,
        reason: "Harassment",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("not found"),
    });
  });

  it("creates report for valid user target", async () => {
    const caller = appRouter.createCaller(context);
    selectQueue.push([{ id: 2 }]); // target user exists

    const result = await caller.moderation.report({
      targetType: "user",
      targetId: 2,
      reason: "Spam",
    });

    expect(result.id).toBeDefined();
  });
});
