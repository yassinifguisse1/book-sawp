import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/connection";
import {
  postCategories,
  postCategoryAssignments,
  posts,
  type Post,
  type PostCategory,
  type User,
} from "@/server/db/schema";
import { bumpCacheVersion, readCache, writeCache } from "@/server/platform/cache";
import { scheduleOutboxProcessing, writeOutboxEvent } from "@/server/domain/outbox";

const POSTS_CACHE_KEY = "posts:feed";
const POSTS_CACHE_VERSION_KEY = "posts:feed:version";
const POST_CACHE_PREFIX = "posts:by-slug:";
const POST_CATEGORIES_CACHE_KEY = "posts:categories";

export type PostWithAuthorAndCategories = Post & {
  author: Pick<User, "id" | "publicId" | "name" | "bio" | "avatar"> | null;
  categories: PostCategory[];
};

export type PostInput = {
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  coverImageUrl?: string | null;
  authorId: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  categoryIds?: number[];
  status?: "draft" | "published" | "archived";
  publishedAt?: Date;
};

function computeReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

async function withTransientReadRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 100 * attempt));
      }
    }
  }
  throw lastError;
}

export async function listPublishedPosts({
  limit = 12,
  offset = 0,
  categorySlug,
}: {
  limit?: number;
  offset?: number;
  categorySlug?: string;
} = {}): Promise<{ items: PostWithAuthorAndCategories[]; total: number }> {
  const version = (await readCache<number>(POSTS_CACHE_VERSION_KEY)) ?? 0;
  const cacheKey = `${POSTS_CACHE_KEY}:v${version}:l${limit}:o${offset}:c${categorySlug ?? "all"}`;

  const cached = await readCache<{ items: PostWithAuthorAndCategories[]; total: number }>(cacheKey);
  if (cached) return cached;

  const db = getDb();

  const result = await withTransientReadRetry("listPublishedPosts", async () => {
    let categoryId: number | undefined;
    if (categorySlug) {
      const [cat] = await db
        .select({ id: postCategories.id })
        .from(postCategories)
        .where(eq(postCategories.slug, categorySlug))
        .limit(1);
      if (!cat) return { items: [], total: 0 };
      categoryId = cat.id;
    }

    const baseWhere = and(
      eq(posts.status, "published"),
      isNull(posts.deletedAt),
      categoryId
        ? inArray(
            posts.id,
            db
              .select({ postId: postCategoryAssignments.postId })
              .from(postCategoryAssignments)
              .where(eq(postCategoryAssignments.categoryId, categoryId))
          )
        : undefined,
    );

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(baseWhere);

    const rows = await db.query.posts.findMany({
      where: baseWhere,
      orderBy: [desc(posts.publishedAt)],
      limit,
      offset,
      with: {
        author: {
          columns: { id: true, publicId: true, name: true, bio: true, avatar: true },
        },
        categoryAssignments: {
          with: {
            category: true,
          },
        },
      },
    });

    const items = rows.map((row) => ({
      ...row,
      categories: row.categoryAssignments.map((a) => a.category),
    }));

    return { items, total: countResult.count };
  });

  await writeCache(cacheKey, result, 300);
  return result;
}

export async function getPostBySlug(
  slug: string
): Promise<PostWithAuthorAndCategories | null> {
  const cacheKey = `${POST_CACHE_PREFIX}${slug}`;
  const cached = await readCache<PostWithAuthorAndCategories>(cacheKey);
  if (cached) return cached;

  const db = getDb();

  const row = await withTransientReadRetry("getPostBySlug", () =>
    db.query.posts.findFirst({
      where: and(eq(posts.slug, slug), isNull(posts.deletedAt)),
      with: {
        author: {
          columns: { id: true, publicId: true, name: true, bio: true, avatar: true },
        },
        categoryAssignments: {
          with: {
            category: true,
          },
        },
      },
    })
  );

  if (!row) return null;

  const result: PostWithAuthorAndCategories = {
    ...row,
    categories: row.categoryAssignments.map((a) => a.category),
  };

  await writeCache(cacheKey, result, 600);
  return result;
}

export type AdminPostRow = Post & {
  author: Pick<User, "id" | "publicId" | "name" | "avatar"> | null;
  categories: PostCategory[];
};

export async function listAllPosts({
  status = "all",
  query = "",
  limit = 25,
  offset = 0,
}: {
  status?: "all" | "draft" | "published" | "archived";
  query?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: AdminPostRow[]; total: number }> {
  const db = getDb();

  const statusFilter = status === "all" ? undefined : eq(posts.status, status);
  const search = query.trim().toLowerCase();
  const searchFilter = search
    ? sql`lower(${posts.title}) like ${`%${search}%`}`
    : undefined;
  const baseWhere = and(statusFilter, searchFilter);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(baseWhere);

  const rows = await db.query.posts.findMany({
    where: baseWhere,
    orderBy: [desc(posts.updatedAt)],
    limit,
    offset,
    with: {
      author: {
        columns: { id: true, publicId: true, name: true, avatar: true },
      },
      categoryAssignments: {
        with: {
          category: true,
        },
      },
    },
  });

  const items = rows.map((row) => ({
    ...row,
    categories: row.categoryAssignments.map((a) => a.category),
  }));

  return { items, total: countResult.count };
}

export async function getPostByPublicId(
  publicId: string
): Promise<PostWithAuthorAndCategories | null> {
  const db = getDb();

  const row = await db.query.posts.findFirst({
    where: eq(posts.publicId, publicId),
    with: {
      author: {
        columns: { id: true, publicId: true, name: true, bio: true, avatar: true },
      },
      categoryAssignments: {
        with: {
          category: true,
        },
      },
    },
  });

  if (!row) return null;

  return {
    ...row,
    categories: row.categoryAssignments.map((a) => a.category),
  };
}

export async function listPostCategories(): Promise<PostCategory[]> {
  const cached = await readCache<PostCategory[]>(POST_CATEGORIES_CACHE_KEY);
  if (cached) return cached;

  const db = getDb();
  const rows = await db.select().from(postCategories).orderBy(asc(postCategories.name));

  await writeCache(POST_CATEGORIES_CACHE_KEY, rows, 600);
  return rows;
}

export async function createPost(input: PostInput): Promise<Post> {
  const db = getDb();

  const readingTime = computeReadingTime(input.content);

  const result = await db.transaction(async (tx) => {
    const [post] = await tx.insert(posts).values({
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt ?? null,
      content: input.content,
      coverImageUrl: input.coverImageUrl ?? null,
      status: input.status ?? "draft",
      authorId: input.authorId,
      publishedAt: input.publishedAt ?? (input.status === "published" ? new Date() : null),
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      readingTimeMinutes: readingTime,
    });

    const postId = Number(post.insertId);

    if (input.categoryIds?.length) {
      await tx.insert(postCategoryAssignments).values(
        input.categoryIds.map((categoryId) => ({
          postId,
          categoryId,
        }))
      );
    }

    await writeOutboxEvent(tx, {
      type: "post.created",
      aggregateType: "post",
      aggregateId: String(postId),
      payload: { postId, slug: input.slug, status: input.status ?? "draft" },
    });

    const [created] = await tx.select().from(posts).where(eq(posts.id, postId));
    return created;
  });

  await invalidatePostCache(input.slug);
  await scheduleOutboxProcessing();
  return result;
}

export async function updatePost(
  publicId: string,
  input: Partial<PostInput>
): Promise<Post> {
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(posts)
      .where(eq(posts.publicId, publicId))
      .limit(1);

    if (!existing) throw new Error("Post not found");

    const updateValues: Partial<typeof posts.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updateValues.title = input.title;
    if (input.excerpt !== undefined) updateValues.excerpt = input.excerpt ?? null;
    if (input.content !== undefined) {
      updateValues.content = input.content;
      updateValues.readingTimeMinutes = computeReadingTime(input.content);
    }
    if (input.coverImageUrl !== undefined) updateValues.coverImageUrl = input.coverImageUrl ?? null;
    if (input.seoTitle !== undefined) updateValues.seoTitle = input.seoTitle ?? null;
    if (input.seoDescription !== undefined) updateValues.seoDescription = input.seoDescription ?? null;
    if (input.status !== undefined) {
      updateValues.status = input.status;
      if (input.status === "published" && !existing.publishedAt) {
        updateValues.publishedAt = new Date();
      }
    }
    if (input.slug !== undefined) updateValues.slug = input.slug;

    await tx.update(posts).set(updateValues).where(eq(posts.publicId, publicId));

    if (input.categoryIds !== undefined) {
      await tx
        .delete(postCategoryAssignments)
        .where(eq(postCategoryAssignments.postId, existing.id));
      if (input.categoryIds.length) {
        await tx.insert(postCategoryAssignments).values(
          input.categoryIds.map((categoryId) => ({
            postId: existing.id,
            categoryId,
          }))
        );
      }
    }

    await writeOutboxEvent(tx, {
      type: "post.updated",
      aggregateType: "post",
      aggregateId: String(existing.id),
      payload: { postId: existing.id, slug: input.slug ?? existing.slug },
    });

    const [updated] = await tx.select().from(posts).where(eq(posts.id, existing.id));
    return updated;
  });

  await invalidatePostCache(result.slug);
  await scheduleOutboxProcessing();
  return result;
}

export async function publishPost(publicId: string): Promise<Post> {
  return updatePost(publicId, { status: "published" });
}

export async function archivePost(publicId: string): Promise<Post> {
  return updatePost(publicId, { status: "archived" });
}

export async function deletePost(publicId: string): Promise<void> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(posts)
    .where(eq(posts.publicId, publicId))
    .limit(1);

  if (!existing) throw new Error("Post not found");

  await db.transaction(async (tx) => {
    await tx
      .update(posts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(posts.publicId, publicId));

    await writeOutboxEvent(tx, {
      type: "post.deleted",
      aggregateType: "post",
      aggregateId: String(existing.id),
      payload: { postId: existing.id, slug: existing.slug },
    });
  });

  await invalidatePostCache(existing.slug);
  await scheduleOutboxProcessing();
}

async function invalidatePostCache(slug: string): Promise<void> {
  await bumpCacheVersion(POSTS_CACHE_VERSION_KEY);
  await writeCache(`${POST_CACHE_PREFIX}${slug}`, null, 0);
}
