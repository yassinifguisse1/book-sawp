import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/server/domain/posts";
import { env } from "@/server/env";
import {
  generateBlogPostingSchema,
  generateBreadcrumbSchema,
  generateOrganizationSchema,
} from "@/lib/seo/schemas";
import { JsonLd } from "@/components/seo/JsonLd";
import BlogPostPage from "@/components/pages/BlogPostPage";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found | BookSwap",
    };
  }

  const title = post.seoTitle || `${post.title} | BookSwap Blog`;
  const description = post.seoDescription || post.excerpt || undefined;
  const url = `${env.appUrl}/blog/${post.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url,
      authors: post.author?.name ? [post.author.name] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: post.coverImageUrl
        ? [
            {
              url: post.coverImageUrl,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const site = { url: env.appUrl, name: "BookSwap" };
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      generateOrganizationSchema(site),
      generateBreadcrumbSchema(
        [
          { title: "Home", path: "/" },
          { title: "Blog", path: "/blog" },
          { title: post.title, path: `/blog/${post.slug}` },
        ],
        env.appUrl
      ),
      generateBlogPostingSchema(post, site),
    ],
  };

  return (
    <>
      <JsonLd data={schema} />
      <BlogPostPage post={post} />
    </>
  );
}
