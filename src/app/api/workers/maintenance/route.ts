import { anonymizeDeletedRecords, expireSaleReservations } from "@/server/domain/maintenance";
import { verifyQstashRequest } from "@/server/platform/qstash";

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await verifyQstashRequest(request))) {
    return Response.json({ error: "Invalid QStash signature" }, { status: 401 });
  }
  const [expiredReservations, anonymized] = await Promise.all([
    expireSaleReservations(),
    anonymizeDeletedRecords(),
  ]);
  return Response.json({ expiredReservations, anonymized });
}
