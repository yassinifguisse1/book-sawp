import { Client, Receiver } from "@upstash/qstash";
import { env } from "@/server/env";

export async function enqueueOutboxProcessing() {
  if (!env.qstashToken) {
    return;
  }

  const client = new Client({ token: env.qstashToken });
  await client.publishJSON({
    url: `${env.appUrl}/api/workers/outbox`,
    body: { requestedAt: new Date().toISOString() },
    retries: 5,
  });
}

export async function verifyQstashRequest(request: Request) {
  if (!env.qstashCurrentSigningKey || !env.qstashNextSigningKey) {
    return process.env.NODE_ENV !== "production";
  }

  const signature = request.headers.get("upstash-signature");
  if (!signature) {
    return false;
  }

  const body = await request.clone().text();
  const receiver = new Receiver({
    currentSigningKey: env.qstashCurrentSigningKey,
    nextSigningKey: env.qstashNextSigningKey,
  });

  return receiver.verify({ signature, body });
}
