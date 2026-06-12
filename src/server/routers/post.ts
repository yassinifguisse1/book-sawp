import { z } from "zod";
import {
  archivePost,
  createPost,
  deletePost,
  getPostBySlug,
  listPostCategories,
  listPublishedPosts,
  publishPost,
  updatePost,
} from "@/server/domain/posts";
import { createRouter, publicQuery, staffQuery } from "@/server/trpc";

export const postRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).optional(),
          offset: z.number().min(0).optional(),
          categorySlug: z.string().optional(),
        })
        .optional()
    )
    .query(({ input }) =>
      listPublishedPosts({
        limit: input?.limit,
        offset: input?.offset,
        categorySlug: input?.categorySlug,
      })
    ),

  bySlug: publicQuery
    .input(z.object({ slug: z.string().min(1) }))
    .query(({ input }) => getPostBySlug(input.slug)),

  categories: publicQuery.query(() => listPostCategories()),

  create: staffQuery
    .input(
      z.object({
        slug: z.string().min(1).max(120),
        title: z.string().min(1).max(255),
        excerpt: z.string().max(500).optional(),
        content: z.string().min(1),
        coverImageUrl: z.string().url().optional(),
        seoTitle: z.string().max(160).optional(),
        seoDescription: z.string().max(320).optional(),
        categoryIds: z.array(z.number().int().positive()).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        publishedAt: z.date().optional(),
      })
    )
    .mutation(({ input, ctx }) =>
      createPost({
        ...input,
        authorId: ctx.user.id,
      })
    ),

  update: staffQuery
    .input(
      z.object({
        publicId: z.string().uuid(),
        slug: z.string().min(1).max(120).optional(),
        title: z.string().min(1).max(255).optional(),
        excerpt: z.string().max(500).optional(),
        content: z.string().min(1).optional(),
        coverImageUrl: z.string().url().optional().nullable(),
        seoTitle: z.string().max(160).optional().nullable(),
        seoDescription: z.string().max(320).optional().nullable(),
        categoryIds: z.array(z.number().int().positive()).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        publishedAt: z.date().optional(),
      })
    )
    .mutation(({ input }) => {
      const { publicId, ...data } = input;
      return updatePost(publicId, data);
    }),

  publish: staffQuery
    .input(z.object({ publicId: z.string().uuid() }))
    .mutation(({ input }) => publishPost(input.publicId)),

  archive: staffQuery
    .input(z.object({ publicId: z.string().uuid() }))
    .mutation(({ input }) => archivePost(input.publicId)),

  delete: staffQuery
    .input(z.object({ publicId: z.string().uuid() }))
    .mutation(({ input }) => deletePost(input.publicId)),
});
