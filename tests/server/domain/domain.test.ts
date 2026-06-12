import { describe, expect, it } from "vitest";

import { scanMarketplaceText } from "@/server/domain/anti-scam";
import { conversationSubjectKey } from "@/server/domain/messaging";
import { assertTransactionTransition } from "@/server/domain/transaction-state";
import { toMajorUnits, toMinorUnits, validateListingMoney } from "@/server/domain/validation";
import { createListing } from "@/server/domain/listings";

describe("money", () => {
  it("stores decimal values as integer minor units", () => {
    expect(toMinorUnits(12.99)).toBe(1299);
    expect(toMajorUnits(1299)).toBe("12.99");
  });

  it("requires positive sale prices and rejects prices on free modes", () => {
    expect(() => validateListingMoney("sale", { amountMinor: 1, currency: "USD" })).not.toThrow();
    expect(() => validateListingMoney("sale", null)).toThrow("positive price");
    expect(() => validateListingMoney("swap", { amountMinor: 1, currency: "USD" })).toThrow("cannot have");
    expect(() => validateListingMoney("giveaway", null)).not.toThrow();
  });
});

describe("listing publishing", () => {
  it("requires an uploaded cover image", async () => {
    await expect(
      createListing(1, {
        title: "The Pragmatic Programmer",
        author: "Andrew Hunt",
        genre: "Non-Fiction",
        condition: "good",
        transactionType: "swap",
        currency: "USD",
        country: "US",
        city: "New York",
      }),
    ).rejects.toThrow("cover image");
  });
});

describe("marketplace anti-scam scan", () => {
  it("flags suspicious off-platform payment pressure", () => {
    const result = scanMarketplaceText("Pay immediately with gift card at https://example.test");
    expect(result.flagged).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("allows normal meetup coordination", () => {
    expect(scanMarketplaceText("Can we meet near the library Saturday afternoon?").flagged).toBe(false);
  });

  it("flags repeated contact sharing and burst spam", () => {
    const recentMessages = Array.from({ length: 8 }, () => "Message me on whatsapp");
    const result = scanMarketplaceText("Use whatsapp", recentMessages);
    expect(result.reasons).toContain("repeated_contact_sharing");
    expect(result.reasons).toContain("spam_frequency");
  });
});

describe("conversation subject keys", () => {
  it("normalizes participant order and keeps listings distinct", () => {
    expect(conversationSubjectKey(9, 2, 4)).toEqual({
      participant1Id: 2,
      participant2Id: 9,
      subjectKey: "2:9:4",
    });
    expect(conversationSubjectKey(2, 9, 5).subjectKey).not.toBe("2:9:4");
  });
});

describe("transaction transitions", () => {
  it.each([
    ["pending", "accepted", true],
    ["pending", "declined", true],
    ["accepted", "completed", true],
    ["pending", "cancelled", false],
    ["accepted", "cancelled", false],
    ["accepted", "expired", false],
  ] as const)("allows %s -> %s", (current, next, isOwner) => {
    expect(() => assertTransactionTransition({ current, next, isOwner })).not.toThrow();
  });

  it.each([
    ["pending", "accepted", false],
    ["pending", "declined", false],
    ["accepted", "completed", false],
    ["completed", "cancelled", true],
    ["pending", "expired", true],
  ] as const)("rejects %s -> %s", (current, next, isOwner) => {
    expect(() => assertTransactionTransition({ current, next, isOwner })).toThrow();
  });
});
