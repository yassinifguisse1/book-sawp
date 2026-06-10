import { Client, Receiver } from "@upstash/qstash";
import { env } from "@/server/env";

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    /^127\.\d+\.\d+\.\d+$/.test(hostname) ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".test")
  );
}

export async function enqueueOutboxProcessing() {
  if (!env.qstashToken) {
    return;
  }

  const destination = new URL("/api/workers/outbox", env.appUrl);
  if (isLocalHostname(destination.hostname)) {
    return;
  }

  const client = new Client({ token: env.qstashToken });
  await client.publishJSON({
    url: destination.toString(),
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
