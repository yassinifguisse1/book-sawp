"use client";

import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import type { PostWithAuthorAndCategories } from "@/server/domain/posts";

interface BlogCardProps {
  post: PostWithAuthorAndCategories;
  showAuthor?: boolean;
}

export function BlogCard({ post, showAuthor = true }: BlogCardProps) {
  const coverImage = post.coverImageUrl ?? "/images/placeholder-book.png";
  const authorName = post.author?.name || "BookSwap Team";
  const publishedAt = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl bg-white transition-shadow">
      <Link href={`/blog/${post.slug}`} className="relative aspect-[16/10] overflow-hidden">
        <img
          src={coverImage}
          alt={post.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {post.categories.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {post.categories.map((category) => (
              <Link
                key={category.id}
                href={`/blog/category/${category.slug}`}
                className="rounded-full bg-[#E6F3F3] px-2.5 py-0.5 text-[11px] font-semibold text-[#007782] hover:bg-[#007782] hover:text-white"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
        <h2 className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-[#2C2C2C]">
          <Link href={`/blog/${post.slug}`} className="hover:text-[#007782]">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-[#6B7280]">
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 text-xs text-[#9CA3AF]">
          {publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {publishedAt}
            </span>
          )}
          {post.readingTimeMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readingTimeMinutes} min read
            </span>
          )}
        </div>
        {showAuthor ? (
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#2C2C2C]">
            {post.author?.avatar ? (
              <img
                src={post.author.avatar}
                alt={authorName}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#007782] text-[10px] text-white">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
            <span>{authorName}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
