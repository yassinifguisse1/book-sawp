import { haversineKm } from "@/lib/geo";

export type ShippingScope =
  | "pickup_only"
  | "domestic_only"
  | "selected_countries"
  | "worldwide";

export type DiscoveryGroup = "nearYou" | "inCountry" | "international";

export type BrowseContext = {
  countryCode: string;
  regionCode: string | null;
  latitude: number | null;
  longitude: number | null;
  /** null means "any distance" (no pickup radius limit). */
  radiusKm: number | null;
  includeDomesticShipping: boolean;
  includeInternationalShipping: boolean;
};

export type ListingLocationFacts = {
  countryCode: string;
  regionCode: string | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
  pickupEnabled: boolean;
  pickupRadiusKm: number | null;
  manualShippingEnabled: boolean;
  shippingScope: ShippingScope;
  shipsToCountryCodes: Set<string>;
};

export function pickupDistanceKm(
  ctx: BrowseContext,
  listing: ListingLocationFacts,
): number | null {
  if (
    ctx.latitude === null ||
    ctx.longitude === null ||
    listing.latitude === null ||
    listing.longitude === null
  ) {
    return null;
  }
  return haversineKm(ctx.latitude, ctx.longitude, listing.latitude, listing.longitude);
}

export function isWithinPickupRadius(
  ctx: BrowseContext,
  listing: ListingLocationFacts,
  distanceKm = pickupDistanceKm(ctx, listing),
): boolean {
  if (!listing.pickupEnabled || distanceKm === null) return false;
  if (ctx.radiusKm === null) return true;
  const effectiveRadius =
    listing.pickupRadiusKm !== null
      ? Math.min(ctx.radiusKm, listing.pickupRadiusKm)
      : ctx.radiusKm;
  return distanceKm <= effectiveRadius;
}

export function shipsToBrowseCountry(
  ctx: BrowseContext,
  listing: ListingLocationFacts,
): boolean {
  if (!listing.manualShippingEnabled) return false;
  switch (listing.shippingScope) {
    case "worldwide":
      return true;
    case "selected_countries":
      return listing.shipsToCountryCodes.has(ctx.countryCode);
    case "domestic_only":
      return listing.countryCode === ctx.countryCode;
    case "pickup_only":
    default:
      return false;
  }
}

/**
 * Whether a listing belongs in the buyer's primary results, applied BEFORE
 * ranking. A listing qualifies when it is within the pickup radius, the seller
 * ships to the browse country, or the buyer opted into international results.
 */
export function isEligible(
  ctx: BrowseContext,
  listing: ListingLocationFacts,
  distanceKm = pickupDistanceKm(ctx, listing),
): boolean {
  return classifyGroup(ctx, listing, distanceKm) !== null;
}

/**
 * Assigns a listing to a discovery section. Returns null when the buyer has no
 * realistic way to obtain the book (so it is excluded from primary results).
 */
export function classifyGroup(
  ctx: BrowseContext,
  listing: ListingLocationFacts,
  distanceKm = pickupDistanceKm(ctx, listing),
): DiscoveryGroup | null {
  if (isWithinPickupRadius(ctx, listing, distanceKm)) {
    return "nearYou";
  }

  const sameCountry = listing.countryCode === ctx.countryCode;
  const shipsHere = shipsToBrowseCountry(ctx, listing);

  if (sameCountry) {
    const reachableByDomesticShipping = shipsHere && ctx.includeDomesticShipping;
    if (listing.pickupEnabled || reachableByDomesticShipping) {
      return "inCountry";
    }
    return null;
  }

  if (shipsHere || ctx.includeInternationalShipping) {
    return "international";
  }
  return null;
}
