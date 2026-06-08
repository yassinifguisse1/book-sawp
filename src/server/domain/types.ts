export type Money = {
  amountMinor: number;
  currency: string;
};

export type ListingMode = "swap" | "giveaway" | "sale";

export type ListingStatus =
  | "draft"
  | "active"
  | "reserved"
  | "completed"
  | "withdrawn"
  | "suspended";

export type TransactionKind =
  | "swap_request"
  | "giveaway_request"
  | "sale_reservation";

export type TransactionStatus =
  | "pending"
  | "accepted"
  | "completed"
  | "declined"
  | "cancelled"
  | "expired";

export type DomainEvent = {
  eventId: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  version: number;
  payload: Record<string, unknown>;
};

export type SensitiveAction =
  | "listing.publish"
  | "listing.edit"
  | "transaction.create"
  | "transaction.update"
  | "message.start"
  | "message.send"
  | "review.create"
  | "report.create";
