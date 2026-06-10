import { describe, expect, it } from "vitest";

import {
  rankListings,
  scoreListing,
  type RankableListing,
} from "@/server/domain/marketplace-ranking";
import type { BrowseContext, ListingLocationFacts } from "@/server/domain/search-eligibility";

const browse: BrowseContext = {
  countryCode: "US",
  regionCode: "OR",
  latitude: 45.5152,
  longitude: -122.6784,
  radiusKm: 25,
  includeDomesticShipping: true,
  includeInternationalShipping: false,
};

function facts(overrides: Partial<ListingLocationFacts> = {}): ListingLocationFacts {
  return {
    countryCode: "US",
    regionCode: "OR",
    cityName: "Portland",
    latitude: 45.52,
    longitude: -122.68,
    pickupEnabled: true,
    pickupRadiusKm: null,
    manualShippingEnabled: false,
    shippingScope: "pickup_only",
    shipsToCountryCodes: new Set<string>(),
    ...overrides,
  };
}

function rankable(overrides: Partial<RankableListing> = {}): RankableListing {
  return {
    facts: facts(overrides.facts),
    createdAt: new Date(),
    imageCount: 1,
    descriptionLength: 100,
    textScore: 1,
    sellerTrustScore: 0,
    promoted: false,
    ...overrides,
  };
}

describe("scoreListing", () => {
  it("scores a closer pickup listing higher than a far one", () => {
    const near = rankable();
    const far = rankable({ facts: facts({ latitude: 47.6062, longitude: -122.3321 }) });
    expect(scoreListing(browse, near)).toBeGreaterThan(scoreListing(browse, far));
  });

  it("scores a stronger text match higher", () => {
    const strong = rankable({ textScore: 1 });
    const weak = rankable({ textScore: 0.2 });
    expect(scoreListing(browse, strong)).toBeGreaterThan(scoreListing(browse, weak));
  });

  it("rewards same-region listings only when browse region is known", () => {
    const sameRegion = rankable({ facts: facts({ regionCode: "OR" }) });
    const otherRegion = rankable({ facts: facts({ regionCode: "WA" }) });
    expect(scoreListing(browse, sameRegion)).toBeGreaterThan(scoreListing(browse, otherRegion));

    const countryOnlyBrowse = { ...browse, regionCode: null };
    expect(scoreListing(countryOnlyBrowse, sameRegion)).toBe(
      scoreListing(countryOnlyBrowse, otherRegion),
    );
  });

  it("rewards fresher listings", () => {
    const fresh = rankable({ createdAt: new Date() });
    const stale = rankable({ createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) });
    expect(scoreListing(browse, fresh)).toBeGreaterThan(scoreListing(browse, stale));
  });

  it("never lets a promoted boost outrank a much closer organic listing", () => {
    const promotedFar = rankable({
      facts: facts({ latitude: 47.6062, longitude: -122.3321 }),
      promoted: true,
    });
    const organicNear = rankable();
    expect(scoreListing(browse, organicNear)).toBeGreaterThan(scoreListing(browse, promotedFar));
  });
});

describe("rankListings", () => {
  it("orders listings by descending score without mutating the input", () => {
    const near = rankable();
    const far = rankable({ facts: facts({ latitude: 47.6062, longitude: -122.3321 }) });
    const input = [far, near];
    const ranked = rankListings(browse, input);
    expect(ranked[0]).toBe(near);
    expect(ranked[1]).toBe(far);
    expect(input[0]).toBe(far);
  });
});
