import { beforeEach, describe, expect, it, vi } from "vitest";

const selectQueue: unknown[][] = [];
let insertCounter = 0;

function nextSelectResult() {
  return selectQueue.shift() ?? [];
}

function fakeSelectResult() {
  const rows = nextSelectResult();
  const result = {
    leftJoin: () => result,
    where: () => result,
    orderBy: () => result,
    groupBy: () => result,
    limit: async () => rows,
    then(
      onFulfilled?: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(rows).then(onFulfilled, onRejected);
    },
  };
  return result;
}

function fakeSelect() {
  const builder = {
    from: () => builder,
    leftJoin: () => builder,
    where: () => fakeSelectResult(),
    orderBy: () => builder,
    groupBy: () => builder,
    limit: async () => nextSelectResult(),
  };
  return builder;
}

const fakeTx = {
  select: () => fakeSelect(),
  insert: () => ({
    values: async () => {
      insertCounter += 1;
      return [{ insertId: insertCounter }];
    },
  }),
  update: () => ({
    set: () => ({
      where: async () => ({ affectedRows: 1 }),
    }),
  }),
};

vi.mock("@/server/db/connection", () => ({
  getDb: () => ({
    select: () => fakeSelect(),
    insert: () => ({
      values: async () => {
        insertCounter += 1;
        return [{ insertId: insertCounter }];
      },
    }),
    update: () => ({
      set: () => ({
        where: async () => ({ affectedRows: 1 }),
      }),
    }),
    transaction: async (callback: (tx: typeof fakeTx) => Promise<unknown>) => callback(fakeTx),
  }),
}));

vi.mock("@/server/domain/outbox", () => ({
  scheduleOutboxProcessing: vi.fn(),
  writeOutboxEvent: vi.fn(),
}));

vi.mock("@/server/domain/messaging", () => ({
  ensureConversation: vi.fn(),
}));

vi.mock("@/server/domain/notifications", () => ({
  createNotification: vi.fn(),
}));

import { createTransaction } from "@/server/domain/transactions";

describe("transaction idempotency", () => {
  beforeEach(() => {
    selectQueue.length = 0;
    insertCounter = 0;
  });

  it("returns existing transaction when idempotency key matches same params", async () => {
    selectQueue.push(
      [
        {
          id: 99,
          bookId: 1,
          requesterId: 2,
          type: "swap_request",
        },
      ],
    );

    const result = await createTransaction({
      requesterId: 2,
      bookId: 1,
      idempotencyKey: "same-key",
    });

    expect(result.id).toBe(99);
  });

  it("throws CONFLICT when idempotency key is reused with different params", async () => {
    selectQueue.push(
      [
        {
          id: 99,
          bookId: 1,
          requesterId: 2,
          type: "swap_request",
        },
      ],
    );

    await expect(
      createTransaction({
        requesterId: 3, // different requester
        bookId: 2, // different book
        idempotencyKey: "same-key",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("creates new transaction when no idempotency key exists", async () => {
    selectQueue.push(
      [], // no existing transaction
      [{ id: 1, ownerId: 3, transactionType: "giveaway", status: "active" }], // book
    );

    const result = await createTransaction({
      requesterId: 2,
      bookId: 1,
      idempotencyKey: "new-key",
    });

    expect(result.id).toBeDefined();
  });
});
