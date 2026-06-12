import Link from "next/link";
import type { User } from "@/server/db/schema";

interface AuthorBioProps {
  author: Pick<User, "id" | "publicId" | "name" | "bio" | "avatar"> | null;
}

export function AuthorBio({ author }: AuthorBioProps) {
  if (!author) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#007782] text-lg font-bold text-white">
            B
          </div>
          <div>
            <p className="font-semibold text-[#2C2C2C]">BookSwap Team</p>
            <p className="text-sm text-[#6B7280]">Stories, tips, and updates from the BookSwap community.</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = author.name || "BookSwap Member";

  return (
    <aside className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {author.avatar ? (
          <img
            src={author.avatar}
            alt={displayName}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#007782] text-xl font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-[#9CA3AF]">Written by</p>
          <Link
            href={`/profile/${author.publicId}`}
            className="text-lg font-bold text-[#2C2C2C] hover:text-[#007782]"
          >
            {displayName}
          </Link>
          {author.bio && (
            <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">{author.bio}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
