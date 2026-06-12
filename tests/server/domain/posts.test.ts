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
    innerJoin: () => result,
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
  const builder: {
    from: () => typeof builder;
    leftJoin: () => typeof builder;
    innerJoin: () => typeof builder;
    where: () => ReturnType<typeof fakeSelectResult>;
    orderBy: () => typeof builder;
    groupBy: () => typeof builder;
    limit: () => Promise<unknown[]>;
    then: (
      onFulfilled?: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise<unknown>;
  } = {
    from: () => builder,
    leftJoin: () => builder,
    innerJoin: () => builder,
    where: () => fakeSelectResult(),
    orderBy: () => builder,
    groupBy: () => builder,
    limit: async () => nextSelectResult(),
    then(onFulfilled, onRejected) {
      return Promise.resolve(nextSelectResult()).then(onFulfilled, onRejected);
    },
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
  delete: () => ({
    where: async () => ({ affectedRows: 1 }),
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
    delete: () => ({
      where: async () => ({ affectedRows: 1 }),
    }),
    query: {
      posts: {
        findMany: async () => nextSelectResult(),
        findFirst: async () => {
          const rows = nextSelectResult();
          return rows[0] ?? null;
        },
      },
    },
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

import { createPost, getPostBySlug, listPostCategories, listPublishedPosts } from "@/server/domain/posts";
import { readCache } from "@/server/platform/cache";

describe.sequential("posts domain", () => {
  beforeEach(() => {
    selectQueue.length = 0;
    insertCounter = 0;
    vi.mocked(readCache).mockResolvedValue(null);
  });

  describe("listPublishedPosts", () => {
    it("returns empty when no posts exist", async () => {
      selectQueue.push([{ count: 0 }]);
      const result = await listPublishedPosts();
      expect(result.items).toEqual([]);
      expect(result.total).toEqual(0);
    });

    it("returns published posts with authors and categories", async () => {
      selectQueue.push([{ count: 2 }]);
      selectQueue.push([
        {
          id: 1,
          publicId: "post-1",
          slug: "how-to-swap",
          title: "How to Swap",
          author: { id: 1, publicId: "user-1", name: "Alice", avatar: null },
          categoryAssignments: [
            { category: { id: 1, publicId: "cat-1", slug: "tips", name: "Tips" } },
          ],
        },
        {
          id: 2,
          publicId: "post-2",
          slug: "summer-reads",
          title: "Summer Reads",
          author: { id: 2, publicId: "user-2", name: "Bob", avatar: null },
          categoryAssignments: [],
        },
      ]);

      const result = await listPublishedPosts();
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe("How to Swap");
      expect(result.items[0].categories).toHaveLength(1);
      expect(result.total).toBe(2);
    });
  });

  describe("getPostBySlug", () => {
    it("returns null when post not found", async () => {
      selectQueue.push([]);
      const result = await getPostBySlug("missing");
      expect(result).toBeNull();
    });

    it("returns post with categories", async () => {
      selectQueue.push([
        {
          id: 1,
          publicId: "post-1",
          slug: "how-to-swap",
          title: "How to Swap",
          author: { id: 1, publicId: "user-1", name: "Alice", avatar: null },
          categoryAssignments: [
            { category: { id: 1, publicId: "cat-1", slug: "tips", name: "Tips" } },
          ],
        },
      ]);

      const result = await getPostBySlug("how-to-swap");
      expect(result).not.toBeNull();
      expect(result?.title).toBe("How to Swap");
      expect(result?.categories[0].name).toBe("Tips");
    });
  });

  describe("listPostCategories", () => {
    it("returns categories from database", async () => {
      selectQueue.push([
        { id: 1, publicId: "cat-1", slug: "tips", name: "Tips" },
        { id: 2, publicId: "cat-2", slug: "reviews", name: "Reviews" },
      ]);

      const result = await listPostCategories();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Tips");
    });
  });

  describe("createPost", () => {
    it("inserts a post and assigns categories", async () => {
      selectQueue.push([{ id: 1, publicId: "post-1", slug: "how-to-swap", title: "How to Swap" }]);

      const result = await createPost({
        slug: "how-to-swap",
        title: "How to Swap",
        content: "<p>Content</p>",
        authorId: 1,
        categoryIds: [1, 2],
        status: "published",
      });

      expect(result.slug).toBe("how-to-swap");
      expect(result.title).toBe("How to Swap");
    });
  });
});
