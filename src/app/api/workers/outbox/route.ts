import { processOutboxBatch } from "@/server/domain/outbox-worker";
import { verifyQstashRequest } from "@/server/platform/qstash";

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!(await verifyQstashRequest(request))) {
    return Response.json({ error: "Invalid QStash signature" }, { status: 401 });
  }
  const result = await processOutboxBatch();
  return Response.json(result, { status: result.failed ? 503 : 200 });
}
