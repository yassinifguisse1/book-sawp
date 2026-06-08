import { z } from "zod";
import type { ListingMode, Money, TransactionKind } from "./types";

export const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Use a three-letter ISO currency code");

export const countrySchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Use a two-letter ISO country code");

export function toMinorUnits(value: number) {
  return Math.round(value * 100);
}

export function toMajorUnits(value: number | null) {
  return value === null ? null : (value / 100).toFixed(2);
}

export function validateListingMoney(mode: ListingMode, money: Money | null) {
  if (mode === "sale" && (!money || money.amountMinor <= 0)) {
    throw new Error("Sale listings require a positive price");
  }
  if (mode !== "sale" && money) {
    throw new Error("Swap and giveaway listings cannot have a sale price");
  }
}

export function transactionKindForMode(mode: ListingMode): TransactionKind {
  switch (mode) {
    case "swap":
      return "swap_request";
    case "giveaway":
      return "giveaway_request";
    case "sale":
      return "sale_reservation";
  }
}
