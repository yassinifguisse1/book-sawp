import type { MetadataRoute } from "next";
import { env } from "@/server/env";
import { listPublishedPosts } from "@/server/domain/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.appUrl;

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/how-it-works`, lastModified: new Date(), priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), priority: 0.3 },
    { url: `${baseUrl}/cookies`, lastModified: new Date(), priority: 0.3 },
  ];

  // Blog posts
  const { items: posts } = await listPublishedPosts({ limit: 1000 });
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    priority: 0.8,
  }));

  return [...staticRoutes, ...blogRoutes];
}
