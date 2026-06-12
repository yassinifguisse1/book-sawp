import type { Metadata } from "next";
import { listPublishedPosts } from "@/server/domain/posts";
import { env } from "@/server/env";
import { generateBlogSchema, generateBreadcrumbSchema, generateOrganizationSchema } from "@/lib/seo/schemas";
import { JsonLd } from "@/components/seo/JsonLd";
import BlogIndexPage from "@/components/pages/BlogIndexPage";

export const metadata: Metadata = {
  title: "BookSwap Blog | Reading Tips, Reviews & Community Stories",
  description:
    "Discover reading tips, book reviews, community stories, and sustainable book swapping advice on the BookSwap blog.",
  openGraph: {
    title: "BookSwap Blog | Reading Tips, Reviews & Community Stories",
    description:
      "Discover reading tips, book reviews, community stories, and sustainable book swapping advice on the BookSwap blog.",
    type: "website",
    url: `${env.appUrl}/blog`,
  },
  alternates: {
    canonical: `${env.appUrl}/blog`,
  },
};

export default async function Page() {
  const { items: posts } = await listPublishedPosts({ limit: 24 });

  const site = { url: env.appUrl, name: "BookSwap" };
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      generateOrganizationSchema(site),
      generateBreadcrumbSchema(
        [
          { title: "Home", path: "/" },
          { title: "Blog", path: "/blog" },
        ],
        env.appUrl
      ),
      generateBlogSchema(posts, site),
    ],
  };

  return (
    <>
      <JsonLd data={schema} />
      <BlogIndexPage posts={posts} />
    </>
  );
}
