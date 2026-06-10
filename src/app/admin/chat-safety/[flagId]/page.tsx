import { notFound } from "next/navigation";

import ChatSafetyDetailPage from "@/components/admin/chat-safety/ChatSafetyDetailPage";
import { getChatSafetyFlag } from "@/components/admin/chat-safety/mock-data";

export default async function Page({ params }: { params: Promise<{ flagId: string }> }) {
  const { flagId } = await params;
  if (!getChatSafetyFlag(flagId)) notFound();
  return <ChatSafetyDetailPage flagId={flagId} />;
}
