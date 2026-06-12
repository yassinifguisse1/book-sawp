"use client";

import Link from "next/link";
import { BlogCard } from "@/components/blog/BlogCard";
import type { PostWithAuthorAndCategories } from "@/server/domain/posts";

interface BlogIndexPageProps {
  posts: PostWithAuthorAndCategories[];
}

export default function BlogIndexPage({ posts }: BlogIndexPageProps) {
  return (
    <main className="min-h-screen bg-[#FAF9F7]">
      <section className="bg-[#007782] py-16 text-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-white/80">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>Blog</span>
          </nav>
          <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">BookSwap Blog</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90">
            Reading tips, book reviews, community stories, and sustainable book swapping advice.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        {posts.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#2C2C2C]">No posts yet</h2>
            <p className="mt-2 text-[#6B7280]">Check back soon for stories from the BookSwap community.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
