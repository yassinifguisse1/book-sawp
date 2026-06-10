import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { slugify } from "@/lib/slugs";
import { getDb } from "@/server/db/connection";
import { books, categories, moderationAuditLogs, type Category } from "@/server/db/schema";
import { bumpCacheVersion, readCache, writeCache } from "@/server/platform/cache";

export type CategoryStatus = "draft" | "active" | "inactive";

export type CategorySeed = {
  slug: string;
  name: string;
  children?: CategorySeed[];
};

export type CategoryTreeNode = {
  id: number;
  publicId: string;
  parentId: number | null;
  slug: string;
  name: string;
  status: CategoryStatus;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  listingCount: number;
  depth: number;
  path: string;
  isLeaf: boolean;
  children: CategoryTreeNode[];
};

type CategoryRow = Category & { listingCount: number };

export const defaultCategoryTree: CategorySeed[] = [
  {
    slug: "fiction",
    name: "Fiction",
    children: [
      { slug: "general-fiction", name: "General Fiction" },
      { slug: "classics", name: "Classics" },
      { slug: "mystery", name: "Mystery" },
      { slug: "romance", name: "Romance" },
      { slug: "sci-fi-fantasy", name: "Sci-Fi & Fantasy" },
      { slug: "horror", name: "Horror" },
    ],
  },
  {
    slug: "non-fiction",
    name: "Non-Fiction",
    children: [
      { slug: "general-non-fiction", name: "General Non-Fiction" },
      { slug: "biography", name: "Biography" },
      { slug: "history", name: "History" },
      { slug: "self-help", name: "Self-Help" },
      { slug: "science-nature", name: "Science & Nature" },
    ],
  },
  {
    slug: "childrens-books",
    name: "Children's Books",
    children: [
      { slug: "childrens-fiction", name: "Children's Fiction" },
      { slug: "early-readers", name: "Early Readers" },
      { slug: "young-adult", name: "Young Adult" },
    ],
  },
  {
    slug: "textbooks-academic",
    name: "Textbooks & Academic",
    children: [
      { slug: "general-academic", name: "General Academic" },
      { slug: "textbooks", name: "Textbooks" },
      { slug: "study-guides", name: "Study Guides" },
      { slug: "school-books", name: "School Books" },
    ],
  },
  {
    slug: "comics-manga-graphic-novels",
    name: "Comics, Manga & Graphic Novels",
    children: [
      { slug: "comics", name: "Comics" },
      { slug: "manga", name: "Manga" },
      { slug: "graphic-novels", name: "Graphic Novels" },
    ],
  },
  {
    slug: "religion-spirituality",
    name: "Religion & Spirituality",
    children: [
      { slug: "religion", name: "Religion" },
      { slug: "spirituality", name: "Spirituality" },
    ],
  },
  {
    slug: "business-career",
    name: "Business & Career",
    children: [
      { slug: "business", name: "Business" },
      { slug: "career", name: "Career" },
      { slug: "personal-finance", name: "Personal Finance" },
    ],
  },
  {
    slug: "cookbooks-food",
    name: "Cookbooks & Food",
    children: [
      { slug: "cookbooks", name: "Cookbooks" },
      { slug: "baking", name: "Baking" },
    ],
  },
  {
    slug: "art-photography-design",
    name: "Art, Photography & Design",
    children: [
      { slug: "art", name: "Art" },
      { slug: "photography", name: "Photography" },
      { slug: "design", name: "Design" },
    ],
  },
  {
    slug: "language-learning",
    name: "Language Learning",
    children: [
      { slug: "english-language-learning", name: "English Language Learning" },
      { slug: "foreign-languages", name: "Foreign Languages" },
    ],
  },
  {
    slug: "reference",
    name: "Reference",
    children: [
      { slug: "dictionaries", name: "Dictionaries" },
      { slug: "encyclopedias", name: "Encyclopedias" },
      { slug: "writing-reference", name: "Writing Reference" },
    ],
  },
];

export const legacyGenreCategorySlug: Record<string, string> = {
  Fiction: "general-fiction",
  "Non-Fiction": "general-non-fiction",
  "Sci-Fi & Fantasy": "sci-fi-fantasy",
  Romance: "romance",
  Mystery: "mystery",
  Biography: "biography",
  "Self-Help": "self-help",
  Academic: "general-academic",
  "Children's": "childrens-fiction",
  "Children's Books": "childrens-fiction",
  History: "history",
  Cooking: "cookbooks",
  Horror: "horror",
};

function flattenTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

function buildCategoryTree(rows: CategoryRow[]) {
  const byParent = new Map<number | null, CategoryRow[]>();
  for (const row of rows) {
    const key = row.parentId ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), row]);
  }

  function build(parentId: number | null, parentPath: string, depth: number): CategoryTreeNode[] {
    return (byParent.get(parentId) ?? [])
      .toSorted((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((row) => {
        const path = parentPath ? `${parentPath} > ${row.name}` : row.name;
        const children = build(row.id, path, depth + 1);
        return {
          id: row.id,
          publicId: row.publicId,
          parentId: row.parentId,
          slug: row.slug,
          name: row.name,
          status: row.status as CategoryStatus,
          sortOrder: row.sortOrder,
          seoTitle: row.seoTitle,
          seoDescription: row.seoDescription,
          listingCount: row.listingCount,
          depth,
          path,
          isLeaf: children.length === 0,
          children,
        };
      });
  }

  return build(null, "", 0);
}

async function queryCategoryRows(activeOnly: boolean): Promise<CategoryRow[]> {
  const db = getDb();
  const [categoryRows, countRows] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(activeOnly ? eq(categories.status, "active") : undefined)
      .orderBy(asc(categories.parentId), asc(categories.sortOrder), asc(categories.name)),
    db
      .select({
        categoryId: books.categoryId,
        value: sql<number>`count(*)`,
      })
      .from(books)
      .groupBy(books.categoryId),
  ]);
  const countByCategory = new Map(
    countRows
      .filter((row) => row.categoryId !== null)
      .map((row) => [row.categoryId as number, Number(row.value)]),
  );

  return categoryRows.map((row) => ({
    ...row,
    listingCount: countByCategory.get(row.id) ?? 0,
  }));
}

export async function listPublicCategoryTree() {
  const version = (await readCache<number>("taxonomy:version")) ?? 0;
  const cacheKey = `taxonomy:public:${version}`;
  const cached = await readCache<CategoryTreeNode[]>(cacheKey);
  if (cached) return cached;

  const tree = buildCategoryTree(await queryCategoryRows(true));
  await writeCache(cacheKey, tree, 300);
  return tree;
}

export async function listPublicCategoriesFlat() {
  return flattenTree(await listPublicCategoryTree());
}

export async function listPublicSelectableCategories() {
  return (await listPublicCategoriesFlat()).filter((category) => category.isLeaf);
}

export async function getPublicCategoryDescendantIds(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  const flat = await listPublicCategoriesFlat();
  const category = flat.find((row) => row.slug === normalizedSlug);
  if (!category) return null;

  const collect = (node: CategoryTreeNode): number[] => [
    node.id,
    ...node.children.flatMap(collect),
  ];
  return collect(category);
}

export async function getActiveLeafCategory(categoryId: number) {
  const db = getDb();
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.status, "active")))
    .limit(1);

  if (!category) {
    throw new Error("Choose an active book category.");
  }

  const [child] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.parentId, category.id), eq(categories.status, "active")))
    .limit(1);

  if (child) {
    throw new Error("Choose a more specific book category.");
  }

  return category;
}

export async function getCategoryById(categoryId: number) {
  return (
    await getDb()
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1)
  ).at(0) ?? null;
}

export async function listAdminCategoryTree() {
  const tree = buildCategoryTree(await queryCategoryRows(false));
  const flat = flattenTree(tree);
  return {
    tree,
    flat,
    summary: {
      total: flat.length,
      active: flat.filter((category) => category.status === "active").length,
      draft: flat.filter((category) => category.status === "draft").length,
      inactive: flat.filter((category) => category.status === "inactive").length,
      assignedListings: flat.reduce((sum, category) => sum + category.listingCount, 0),
    },
  };
}

async function slugExists(slug: string) {
  const [existing] = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return Boolean(existing);
}

async function uniqueCategorySlug(name: string) {
  const base = slugify(name, "category");
  let slug = base;
  let suffix = 2;
  while (await slugExists(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function assertParentAllowsChild(parentId: number | null | undefined) {
  if (!parentId) return;
  const parent = await getCategoryById(parentId);
  if (!parent) throw new Error("Parent category not found.");
  if (parent.status === "inactive") {
    throw new Error("Cannot add a child under an inactive category.");
  }
}

export async function createCategory(input: {
  actorUserId: number;
  name: string;
  parentId?: number | null;
  status: CategoryStatus;
  sortOrder?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
}) {
  await assertParentAllowsChild(input.parentId);
  const slug = await uniqueCategorySlug(input.name);
  const db = getDb();
  const [result] = await db.insert(categories).values({
    parentId: input.parentId ?? null,
    slug,
    name: input.name,
    status: input.status,
    sortOrder: input.sortOrder ?? 0,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  });
  const categoryId = Number(result.insertId);
  await db.insert(moderationAuditLogs).values({
    actorUserId: input.actorUserId,
    action: "taxonomy.category_created",
    targetType: "category",
    targetId: categoryId,
    metadata: { slug, status: input.status, parentId: input.parentId ?? null },
  });
  await invalidateTaxonomyCache();
  return getCategoryById(categoryId);
}

export async function updateCategory(input: {
  actorUserId: number;
  categoryId: number;
  name?: string;
  sortOrder?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
}) {
  const current = await getCategoryById(input.categoryId);
  if (!current) throw new Error("Category not found.");

  const updates = {
    name: input.name,
    sortOrder: input.sortOrder,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  };
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(safeUpdates).length === 0) return current;

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(categories).set(safeUpdates).where(eq(categories.id, input.categoryId));
    if (input.name && input.name !== current.name) {
      await tx.update(books).set({ genre: input.name }).where(eq(books.categoryId, input.categoryId));
    }
    await tx.insert(moderationAuditLogs).values({
      actorUserId: input.actorUserId,
      action: "taxonomy.category_updated",
      targetType: "category",
      targetId: input.categoryId,
      metadata: { updates: Object.keys(safeUpdates) },
    });
  });
  await invalidateTaxonomyCache(true);
  return getCategoryById(input.categoryId);
}

export async function setCategoryStatus(input: {
  actorUserId: number;
  categoryId: number;
  status: CategoryStatus;
}) {
  const category = await getCategoryById(input.categoryId);
  if (!category) throw new Error("Category not found.");

  const db = getDb();
  if (input.status === "active" && category.parentId) {
    const parent = await getCategoryById(category.parentId);
    if (!parent || parent.status !== "active") {
      throw new Error("Activate the parent category first.");
    }
  }
  if (input.status !== "active") {
    const [activeChild] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.parentId, input.categoryId), eq(categories.status, "active")))
      .limit(1);
    if (activeChild) {
      throw new Error("Deactivate child categories before deactivating this category.");
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(categories).set({ status: input.status }).where(eq(categories.id, input.categoryId));
    await tx.insert(moderationAuditLogs).values({
      actorUserId: input.actorUserId,
      action: "taxonomy.category_status_updated",
      targetType: "category",
      targetId: input.categoryId,
      metadata: { previousStatus: category.status, nextStatus: input.status },
    });
  });
  await invalidateTaxonomyCache(true);
  return getCategoryById(input.categoryId);
}

export async function mergeCategory(input: {
  actorUserId: number;
  sourceCategoryId: number;
  targetCategoryId: number;
}) {
  if (input.sourceCategoryId === input.targetCategoryId) {
    throw new Error("Choose two different categories to merge.");
  }

  const [source, target] = await Promise.all([
    getCategoryById(input.sourceCategoryId),
    getActiveLeafCategory(input.targetCategoryId),
  ]);
  if (!source) throw new Error("Source category not found.");

  const [sourceChild] = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, source.id))
    .limit(1);
  if (sourceChild) {
    throw new Error("Merge child categories before merging this category.");
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(books)
      .set({ categoryId: target.id, genre: target.name })
      .where(eq(books.categoryId, source.id));
    await tx.update(categories).set({ status: "inactive" }).where(eq(categories.id, source.id));
    await tx.insert(moderationAuditLogs).values({
      actorUserId: input.actorUserId,
      action: "taxonomy.category_merged",
      targetType: "category",
      targetId: source.id,
      metadata: { sourceSlug: source.slug, targetId: target.id, targetSlug: target.slug },
    });
  });
  await invalidateTaxonomyCache(true);
  return { success: true };
}

export async function deleteUnusedCategory(input: {
  actorUserId: number;
  categoryId: number;
}) {
  const db = getDb();
  const category = await getCategoryById(input.categoryId);
  if (!category) throw new Error("Category not found.");

  const [[child], [listing]] = await Promise.all([
    db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, input.categoryId)).limit(1),
    db.select({ id: books.id }).from(books).where(eq(books.categoryId, input.categoryId)).limit(1),
  ]);
  if (child) throw new Error("Move or delete child categories first.");
  if (listing) throw new Error("Categories with listings cannot be deleted. Deactivate or merge instead.");

  await db.transaction(async (tx) => {
    await tx.delete(categories).where(eq(categories.id, input.categoryId));
    await tx.insert(moderationAuditLogs).values({
      actorUserId: input.actorUserId,
      action: "taxonomy.category_deleted",
      targetType: "category",
      targetId: input.categoryId,
      metadata: { slug: category.slug },
    });
  });
  await invalidateTaxonomyCache();
  return { success: true };
}

export async function assignLegacyGenresToCategories() {
  const db = getDb();
  const flat = await db.select().from(categories);
  const bySlug = new Map(flat.map((category) => [category.slug, category]));

  for (const [genre, slug] of Object.entries(legacyGenreCategorySlug)) {
    const category = bySlug.get(slug);
    if (!category) continue;
    await db
      .update(books)
      .set({ categoryId: category.id, genre: category.name })
      .where(and(eq(books.genre, genre), sql`${books.categoryId} IS NULL`));
  }
}

export async function seedDefaultCategories() {
  const db = getDb();
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length > 0) return;

  async function insertNode(node: CategorySeed, parentId: number | null, sortOrder: number) {
    const [result] = await db.insert(categories).values({
      parentId,
      slug: node.slug,
      name: node.name,
      status: "active",
      sortOrder,
      seoTitle: `${node.name} books`,
      seoDescription: `Browse ${node.name.toLowerCase()} books available for swap, giveaway, and sale on BookSwap.`,
    });
    const categoryId = Number(result.insertId);
    for (const [index, child] of (node.children ?? []).entries()) {
      await insertNode(child, categoryId, index + 1);
    }
  }

  for (const [index, node] of defaultCategoryTree.entries()) {
    await insertNode(node, null, index + 1);
  }
  await assignLegacyGenresToCategories();
  await invalidateTaxonomyCache(true);
}

export async function invalidateTaxonomyCache(includeListings = false) {
  await Promise.all([
    bumpCacheVersion("taxonomy:version"),
    includeListings ? bumpCacheVersion("listings:feed:version") : Promise.resolve(),
  ]);
}

export function flattenCategoryTree(nodes: CategoryTreeNode[]) {
  return flattenTree(nodes);
}

export function categoryIdsForSlugFromTree(nodes: CategoryTreeNode[], slug: string) {
  const node = flattenTree(nodes).find((category) => category.slug === slug);
  if (!node) return null;
  const collect = (category: CategoryTreeNode): number[] => [
    category.id,
    ...category.children.flatMap(collect),
  ];
  return collect(node);
}

export function categoryOptionsFromTree(nodes: CategoryTreeNode[]) {
  return flattenTree(nodes).filter((category) => category.isLeaf);
}
