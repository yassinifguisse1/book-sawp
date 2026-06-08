import { auth } from "@clerk/nextjs/server";
import SwapRequestPage from "@/components/pages/SwapRequestPage";

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return <SwapRequestPage />;
}
