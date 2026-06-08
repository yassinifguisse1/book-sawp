import type { Database } from "@/server/db/connection";
import { outboxEvents } from "@/server/db/schema";
import { enqueueOutboxProcessing } from "@/server/platform/qstash";

type OutboxWriter = Pick<Database, "insert">;

export async function writeOutboxEvent(
  db: OutboxWriter,
  event: {
    type: string;
    aggregateType: string;
    aggregateId: string | number;
    payload: Record<string, unknown>;
  },
) {
  await db.insert(outboxEvents).values({
    type: event.type,
    aggregateType: event.aggregateType,
    aggregateId: String(event.aggregateId),
    payload: event.payload,
  });
}

export async function scheduleOutboxProcessing() {
  try {
    await enqueueOutboxProcessing();
  } catch (error) {
    console.warn("Unable to schedule outbox processing", error);
  }
}
