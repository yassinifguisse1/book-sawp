import { auth } from "@clerk/nextjs/server";

import AdminReportsPage from "@/components/pages/AdminReportsPage";

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return <AdminReportsPage />;
}
