import { auth } from "@clerk/nextjs/server";
import ListBookPage from "@/components/pages/ListBookPage";

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return <ListBookPage />;
}
