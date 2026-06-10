import { describe, expect, it } from "vitest";

import { emptyDiscoveryResult } from "@/server/domain/discovery";

describe("emptyDiscoveryResult", () => {
  it("returns a valid grouped payload with zero totals", () => {
    const result = emptyDiscoveryResult("US", 25);
    expect(result.nearYou.items).toEqual([]);
    expect(result.inCountry.items).toEqual([]);
    expect(result.international.items).toEqual([]);
    expect(result.meta.countryCode).toBe("US");
    expect(result.meta.totalEligible).toBe(0);
    expect(result.meta.sparseNearby).toBe(true);
  });
});
