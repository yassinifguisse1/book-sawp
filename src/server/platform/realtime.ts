import { Rest } from "ably";
import { env } from "@/server/env";

export async function publishConversationEvent(
  conversationPublicId: string,
  name: string,
  data: Record<string, unknown>,
) {
  if (!env.ablyApiKey) {
    return;
  }

  const ably = new Rest(env.ablyApiKey);
  await ably.channels
    .get(`conversation:${conversationPublicId}`)
    .publish(name, data);
}
