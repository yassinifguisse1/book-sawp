import { notFound } from "next/navigation";
import { AdminBlogEditor } from "@/components/admin/blog/AdminBlogEditor";
import { getPostByPublicId } from "@/server/domain/posts";

interface Props {
  params: Promise<{ publicId: string }>;
}

export default async function Page({ params }: Props) {
  const { publicId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(publicId)) {
    notFound();
  }

  const post = await getPostByPublicId(publicId);
  if (!post) {
    notFound();
  }

  return <AdminBlogEditor publicId={publicId} initialData={post} />;
}
