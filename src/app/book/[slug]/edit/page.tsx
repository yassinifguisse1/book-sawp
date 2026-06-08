import { auth } from "@clerk/nextjs/server";
import EditListingPage from "@/components/pages/EditListingPage";

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return <EditListingPage />;
}
