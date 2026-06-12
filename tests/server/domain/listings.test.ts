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
    innerJoin: () => builder,
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

vi.mock("@/server/platform/cache", () => ({
  readCache: vi.fn(),
  writeCache: vi.fn(),
  deleteCache: vi.fn(),
  bumpCacheVersion: vi.fn(),
}));

function makeMinimalPng(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes.buffer;
}

import { createListing, updateListing } from "@/server/domain/listings";

describe("listing image ownership verification", () => {
  beforeEach(() => {
    selectQueue.length = 0;
    insertCounter = 0;
    vi.stubGlobal("fetch", vi.fn());
  });

  it("rejects images not registered in uploadedAssets", async () => {
    selectQueue.push(
      [{ publicId: "owner-uuid" }], // owner lookup
      [], // uploadedAssets query — no matching assets
    );

    await expect(
      createListing(1, {
        title: "Test Book",
        author: "Author",
        genre: "Fiction",
        condition: "good",
        transactionType: "swap",
        currency: "USD",
        country: "US",
        city: "NYC",
        imageUrls: ["https://blob.example.com/listing-covers/foreign.jpg"],
      }),
    ).rejects.toThrow("Upload the book cover image before publishing.");
  });

  it("rejects images uploaded by a different user", async () => {
    selectQueue.push(
      [{ publicId: "owner-uuid" }], // owner lookup
      [
        {
          blobUrl: "https://blob.example.com/listing-covers/other.jpg",
          blobPath: "listing-covers/other.jpg",
          contentType: "image/jpeg",
          sizeBytes: 5000,
          uploaderPublicId: "attacker-uuid",
        },
      ],
    );

    await expect(
      createListing(1, {
        title: "Test Book",
        author: "Author",
        genre: "Fiction",
        condition: "good",
        transactionType: "swap",
        currency: "USD",
        country: "US",
        city: "NYC",
        imageUrls: ["https://blob.example.com/listing-covers/other.jpg"],
      }),
    ).rejects.toThrow("Upload the book cover image before publishing.");
  });

  it("allows images uploaded by the listing owner", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => makeMinimalPng(400, 600),
    } as unknown as Response);

    selectQueue.push(
      [{ publicId: "owner-uuid" }], // owner lookup
      [
        {
          blobUrl: "https://blob.example.com/listing-covers/own.jpg",
          blobPath: "listing-covers/own.jpg",
          contentType: "image/png",
          sizeBytes: 5000,
          uploaderPublicId: "owner-uuid",
        },
      ],
    );

    const result = await createListing(1, {
      title: "Test Book",
      author: "Author",
      genre: "Fiction",
      condition: "good",
      transactionType: "swap",
      currency: "USD",
      country: "US",
      city: "NYC",
      imageUrls: ["https://blob.example.com/listing-covers/own.jpg"],
    });

    expect(result).toBeDefined();
  });

  it("rejects updated images from a different owner", async () => {
    selectQueue.push(
      [{ id: 1, status: "active", priceMinor: null, transactionType: "swap", shippingMinor: 0, pickupEnabled: false, manualShippingEnabled: false, shippingScope: "pickup_only", country: "US", currency: "USD" }], // getOwnedEditableListing
      [{ publicId: "owner-uuid" }], // owner lookup
      [
        {
          blobUrl: "https://blob.example.com/listing-covers/other.jpg",
          blobPath: "listing-covers/other.jpg",
          contentType: "image/jpeg",
          sizeBytes: 5000,
          uploaderPublicId: "attacker-uuid",
        },
      ],
    );

    await expect(
      updateListing(1, 1, {
        imageUrls: ["https://blob.example.com/listing-covers/other.jpg"],
        country: "US",
      }),
    ).rejects.toThrow("Upload the book cover image before publishing.");
  });
});
