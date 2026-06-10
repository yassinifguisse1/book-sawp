import { AdminUserDetailPage } from "@/components/admin/users/AdminUserDetailPage";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) notFound();
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <AdminUserDetailPage userId={id} />;
}

