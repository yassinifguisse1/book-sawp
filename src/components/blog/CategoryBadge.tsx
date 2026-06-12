import Link from "next/link";
import type { PostCategory } from "@/server/db/schema";

interface CategoryBadgeProps {
  category: PostCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <Link
      href={`/blog/category/${category.slug}`}
      className="rounded-full bg-[#E6F3F3] px-3 py-1 text-xs font-semibold text-[#007782] transition-colors hover:bg-[#007782] hover:text-white"
    >
      {category.name}
    </Link>
  );
}
