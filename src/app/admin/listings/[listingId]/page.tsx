import { AdminListingDetailsPage } from "@/components/admin/listings/AdminListingDetailsPage";

export default async function Page({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  return <AdminListingDetailsPage listingId={listingId} />;
}
