import type { TransactionStatus } from "@/server/domain/types";

export function assertTransactionTransition(input: {
  current: TransactionStatus;
  next: Exclude<TransactionStatus, "pending">;
  isOwner: boolean;
}) {
  const { current, next, isOwner } = input;
  if (next === "accepted" || next === "declined") {
    if (!isOwner || current !== "pending") {
      throw new Error("Only the owner can accept or decline a pending request");
    }
    return;
  }
  if (next === "completed") {
    if (!isOwner || current !== "accepted") {
      throw new Error("Only the owner can complete an accepted transaction");
    }
    return;
  }
  if (next === "cancelled") {
    if (!["pending", "accepted"].includes(current)) {
      throw new Error("Only pending or accepted transactions can be cancelled");
    }
    return;
  }
  if (next === "expired" && current !== "accepted") {
    throw new Error("Only accepted reservations can expire");
  }
}
