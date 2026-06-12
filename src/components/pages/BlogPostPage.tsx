"use client";

import Link from "next/link";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { BlogPostContent } from "@/components/blog/BlogPostContent";
import { AuthorBio } from "@/components/blog/AuthorBio";
import { CategoryBadge } from "@/components/blog/CategoryBadge";
import type { PostWithAuthorAndCategories } from "@/server/domain/posts";

interface BlogPostPageProps {
  post: PostWithAuthorAndCategories;
}

export default function BlogPostPage({ post }: BlogPostPageProps) {
  const publishedAt = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const authorName = post.author?.name || "BookSwap Team";

  return (
    <main className="min-h-screen bg-[#FAF9F7]">
      {/* Hero */}
      <div className="relative">
        {post.coverImageUrl && (
          <div className="h-64 w-full overflow-hidden sm:h-80 lg:h-96">
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}
      </div>

      <article className="mx-auto max-w-[800px] px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-[#9CA3AF]">
          <Link href="/" className="hover:text-[#007782]">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-[#007782]">
            Blog
          </Link>
          <span>/</span>
          <span className="text-[#2C2C2C]">{post.title}</span>
        </nav>

        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[#007782] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {/* Categories */}
        {post.categories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.categories.map((category) => (
              <CategoryBadge key={category.id} category={category} />
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold leading-tight text-[#2C2C2C] sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[#6B7280]">
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              alt={authorName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#007782] text-xs font-bold text-white">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-medium text-[#2C2C2C]">{authorName}</span>
          {publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {publishedAt}
            </span>
          )}
          {post.readingTimeMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {post.readingTimeMinutes} min read
            </span>
          )}
        </div>

        {/* Content */}
        <div className="mt-10">
          <BlogPostContent content={post.content} />
        </div>

        {/* Author Bio */}
        <div className="mt-12">
          <AuthorBio author={post.author} />
        </div>
      </article>
    </main>
  );
}
