import { auth } from "@clerk/nextjs/server";

import NotificationsPage from "@/components/pages/NotificationsPage";

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return <NotificationsPage />;
}
