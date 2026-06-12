import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BlogCard } from "@/components/blog/BlogCard";
import type { PostWithAuthorAndCategories } from "@/server/domain/posts";

interface FreshFromBlogProps {
  posts: PostWithAuthorAndCategories[];
}

export function FreshFromBlog({ posts }: FreshFromBlogProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="border-t border-[#E0E0E0] bg-[#FAF9F7] py-12 md:py-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#2C2C2C] md:text-3xl">Fresh from the blog</h2>
            <p className="mt-1.5 text-sm text-[#6B7280]">
              Reading tips, book reviews, and stories from the BookSwap community.
            </p>
          </div>
          <Link
            href="/blog"
            className="hidden items-center gap-1 text-sm font-semibold text-[#007782] hover:text-[#005f66] sm:inline-flex"
          >
            View all articles
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} showAuthor={false} />
          ))}
        </div>

        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#007782] hover:text-[#005f66]"
          >
            View all articles
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
