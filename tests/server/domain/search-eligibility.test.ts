import { describe, expect, it } from "vitest";

import {
  classifyGroup,
  isEligible,
  isWithinPickupRadius,
  shipsToBrowseCountry,
  type BrowseContext,
  type ListingLocationFacts,
} from "@/server/domain/search-eligibility";

// Portland, OR browse point.
const browse: BrowseContext = {
  countryCode: "US",
  regionCode: "OR",
  latitude: 45.5152,
  longitude: -122.6784,
  radiusKm: 25,
  includeDomesticShipping: true,
  includeInternationalShipping: false,
};

function listing(overrides: Partial<ListingLocationFacts> = {}): ListingLocationFacts {
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

describe("isWithinPickupRadius", () => {
  it("includes a nearby pickup listing inside the radius", () => {
    expect(isWithinPickupRadius(browse, listing())).toBe(true);
  });

  it("excludes a pickup listing beyond the radius", () => {
    // Seattle is ~235 km away, well outside the 25 km radius.
    const seattle = listing({ latitude: 47.6062, longitude: -122.3321 });
    expect(isWithinPickupRadius(browse, seattle)).toBe(false);
  });

  it("respects the tighter of the buyer radius and the listing pickup radius", () => {
    const tight = listing({ latitude: 45.7, longitude: -122.9, pickupRadiusKm: 5 });
    expect(isWithinPickupRadius(browse, tight)).toBe(false);
  });

  it("treats a null buyer radius as any distance", () => {
    const anyRadius = { ...browse, radiusKm: null };
    const seattle = listing({ latitude: 47.6062, longitude: -122.3321 });
    expect(isWithinPickupRadius(anyRadius, seattle)).toBe(true);
  });

  it("never includes listings that disable pickup", () => {
    expect(isWithinPickupRadius(browse, listing({ pickupEnabled: false }))).toBe(false);
  });
});

describe("shipsToBrowseCountry", () => {
  it("matches worldwide shipping", () => {
    const fact = listing({ manualShippingEnabled: true, shippingScope: "worldwide" });
    expect(shipsToBrowseCountry(browse, fact)).toBe(true);
  });

  it("matches domestic shipping only within the same country", () => {
    const domestic = listing({ manualShippingEnabled: true, shippingScope: "domestic_only" });
    expect(shipsToBrowseCountry(browse, domestic)).toBe(true);
    expect(shipsToBrowseCountry({ ...browse, countryCode: "CA" }, domestic)).toBe(false);
  });

  it("matches selected countries only when the browse country is listed", () => {
    const selected = listing({
      countryCode: "GB",
      manualShippingEnabled: true,
      shippingScope: "selected_countries",
      shipsToCountryCodes: new Set(["US", "FR"]),
    });
    expect(shipsToBrowseCountry(browse, selected)).toBe(true);
    expect(shipsToBrowseCountry({ ...browse, countryCode: "DE" }, selected)).toBe(false);
  });

  it("never ships when manual shipping is disabled", () => {
    const fact = listing({ manualShippingEnabled: false, shippingScope: "worldwide" });
    expect(shipsToBrowseCountry(browse, fact)).toBe(false);
  });
});

describe("classifyGroup", () => {
  it("puts nearby pickup listings in nearYou", () => {
    expect(classifyGroup(browse, listing())).toBe("nearYou");
  });

  it("puts same-country pickup-only listings outside the radius in inCountry", () => {
    const seattle = listing({ latitude: 47.6062, longitude: -122.3321 });
    expect(classifyGroup(browse, seattle)).toBe("inCountry");
  });

  it("excludes a foreign listing that does not ship here when international is off", () => {
    const foreign = listing({
      countryCode: "FR",
      latitude: 48.8566,
      longitude: 2.3522,
      pickupEnabled: true,
    });
    expect(classifyGroup(browse, foreign)).toBeNull();
    expect(isEligible(browse, foreign)).toBe(false);
  });

  it("includes a foreign shipping listing as international", () => {
    const foreign = listing({
      countryCode: "FR",
      latitude: 48.8566,
      longitude: 2.3522,
      pickupEnabled: false,
      manualShippingEnabled: true,
      shippingScope: "worldwide",
    });
    expect(classifyGroup(browse, foreign)).toBe("international");
  });

  it("includes any foreign listing when international results are enabled", () => {
    const intlBrowse = { ...browse, includeInternationalShipping: true };
    const foreign = listing({
      countryCode: "FR",
      latitude: 48.8566,
      longitude: 2.3522,
      pickupEnabled: false,
      manualShippingEnabled: false,
      shippingScope: "pickup_only",
    });
    expect(classifyGroup(intlBrowse, foreign)).toBe("international");
  });
});
