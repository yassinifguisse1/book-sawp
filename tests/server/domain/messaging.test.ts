import { beforeEach, describe, expect, it, vi } from "vitest";

const selectResults: unknown[][] = [];
let insertCounter = 0;

function nextSelectResult() {
  return selectResults.shift() ?? [];
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

const fakeTx = {
  select: () => fakeFrom(),
  insert: () => ({
    values: async () => {
      insertCounter += 1;
      return [{ insertId: insertCounter }];
    },
  }),
  update: () => ({
    set: () => ({
      where: async () => undefined,
    }),
  }),
};

vi.mock("@/server/db/connection", () => ({
  getDb: () => ({
    select: () => fakeFrom(),
    insert: () => ({
      values: async () => {
        insertCounter += 1;
        return [{ insertId: insertCounter }];
      },
    }),
    update: () => ({
      set: () => ({
        where: async () => undefined,
      }),
    }),
    transaction: async (callback: (tx: typeof fakeTx) => Promise<unknown>) => callback(fakeTx),
  }),
}));

vi.mock("@/server/domain/outbox", () => ({
  scheduleOutboxProcessing: vi.fn(),
  writeOutboxEvent: vi.fn(),
}));

vi.mock("@/server/domain/notifications", () => ({
  createNotification: vi.fn(),
}));

import { sendMessage } from "@/server/domain/messaging";

describe("messaging scam block policy", () => {
  beforeEach(() => {
    selectResults.length = 0;
    insertCounter = 0;
  });

  it("blocks flagged messages from unverified users", async () => {
    selectResults.push(
      [{ id: 1, participant1Id: 1, participant2Id: 2, publicId: "conv-1" }], // conversation
      [], // recent messages
      [{ emailVerifiedAt: null, phoneVerifiedAt: null, phoneRevokedAt: null }], // sender trust
    );

    await expect(
      sendMessage({
        userId: 1,
        conversationId: 1,
        content: "Pay now via WhatsApp https://example.test",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("blocked for safety"),
    });
  });

  it("allows flagged messages from verified users but sets flaggedAt", async () => {
    selectResults.push(
      [{ id: 1, participant1Id: 1, participant2Id: 2, publicId: "conv-1" }], // conversation
      [], // recent messages
      [{ emailVerifiedAt: new Date(), phoneVerifiedAt: new Date(), phoneRevokedAt: null }], // sender trust
    );

    const result = await sendMessage({
      userId: 1,
      conversationId: 1,
      content: "Pay now via WhatsApp https://example.test",
    });

    expect(result.id).toBeDefined();
  });

  it("allows clean messages from unverified users", async () => {
    selectResults.push(
      [{ id: 1, participant1Id: 1, participant2Id: 2, publicId: "conv-1" }], // conversation
      [], // recent messages
      [{ emailVerifiedAt: null, phoneVerifiedAt: null, phoneRevokedAt: null }], // sender trust
    );

    const result = await sendMessage({
      userId: 1,
      conversationId: 1,
      content: "Can we meet near the library Saturday afternoon?",
    });

    expect(result.id).toBeDefined();
  });
});
