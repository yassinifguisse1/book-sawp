import { auth } from "@clerk/nextjs/server";
import MessagesPage from "@/components/pages/MessagesPage";

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return <MessagesPage />;
}
