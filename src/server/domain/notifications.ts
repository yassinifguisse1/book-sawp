import type { Database } from "@/server/db/connection";
import { notifications } from "@/server/db/schema";
import { writeOutboxEvent } from "@/server/domain/outbox";

type NotificationWriter = Pick<Database, "insert">;

export async function createNotification(
  db: NotificationWriter,
  input: {
    userId: number;
    type: string;
    title: string;
    body: string;
    link?: string;
  },
) {
  const [created] = await db.insert(notifications).values(input);
  const notificationId = Number(created.insertId);
  await writeOutboxEvent(db, {
    type: "notification.created",
    aggregateType: "notification",
    aggregateId: notificationId,
    payload: { notificationId },
  });
  return notificationId;
}
