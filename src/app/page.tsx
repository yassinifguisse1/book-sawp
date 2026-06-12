import { Suspense } from "react";
import HomePage from "@/components/pages/HomePage";
import { listPublishedPosts } from "@/server/domain/posts";

export default async function Home() {
  const result = await listPublishedPosts({ limit: 3 });
  const posts = result?.items ?? [];

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomePage posts={posts} />
    </Suspense>
  );
}
