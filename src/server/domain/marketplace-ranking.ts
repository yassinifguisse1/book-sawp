import type { BrowseContext, ListingLocationFacts } from "./search-eligibility";
import { pickupDistanceKm } from "./search-eligibility";

/**
 * Ranking weights, highest priority first. The order mirrors
 * docs/discovery-ranking.md. Eligibility is enforced separately and is never
 * overridden by these weights (including the promoted boost).
 */
export const RANKING_WEIGHTS = {
  textRelevance: 100,
  pickupDistance: 60,
  shippingEligibility: 40,
  sameCity: 24,
  sameRegion: 16,
  sameCountry: 8,
  freshness: 12,
  sellerTrust: 10,
  listingQuality: 6,
  promotedBoost: 4,
} as const;

const DISTANCE_REFERENCE_KM = 100;
const FRESHNESS_HALF_LIFE_DAYS = 14;

export type RankableListing = {
  facts: ListingLocationFacts;
  createdAt: Date;
  imageCount: number;
  descriptionLength: number;
  /** 0..1 text match score; pass 1 when there is no search query. */
  textScore: number;
  sellerTrustScore: number;
  promoted: boolean;
};

function freshnessScore(createdAt: Date): number {
  const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, Math.max(0, ageDays) / FRESHNESS_HALF_LIFE_DAYS);
}

function listingQualityScore(imageCount: number, descriptionLength: number): number {
  const imageScore = Math.min(1, imageCount / 4);
  const descriptionScore = Math.min(1, descriptionLength / 400);
  return (imageScore + descriptionScore) / 2;
}

/** Computes a single ranking score for a listing within a discovery section. */
export function scoreListing(ctx: BrowseContext, listing: RankableListing): number {
  const { facts } = listing;
  const distanceKm = pickupDistanceKm(ctx, facts);

  const distanceScore =
    distanceKm === null ? 0 : Math.max(0, 1 - distanceKm / DISTANCE_REFERENCE_KM);

  const shippingScore = facts.pickupEnabled
    ? 1
    : facts.manualShippingEnabled
      ? 0.6
      : 0;

  const sameCountry = facts.countryCode === ctx.countryCode;
  // No regional boost when browse context has no resolved region (country-only browse).
  const sameRegion =
    sameCountry &&
    ctx.regionCode !== null &&
    facts.regionCode !== null &&
    facts.regionCode === ctx.regionCode;
  // City-level match is approximated by very small pickup distance.
  const sameCity = distanceKm !== null && distanceKm <= 25;

  return (
    RANKING_WEIGHTS.textRelevance * listing.textScore +
    RANKING_WEIGHTS.pickupDistance * distanceScore +
    RANKING_WEIGHTS.shippingEligibility * shippingScore +
    RANKING_WEIGHTS.sameCity * (sameCity ? 1 : 0) +
    RANKING_WEIGHTS.sameRegion * (sameRegion ? 1 : 0) +
    RANKING_WEIGHTS.sameCountry * (sameCountry ? 1 : 0) +
    RANKING_WEIGHTS.freshness * freshnessScore(listing.createdAt) +
    RANKING_WEIGHTS.sellerTrust * Math.min(1, Math.max(0, listing.sellerTrustScore)) +
    RANKING_WEIGHTS.listingQuality *
      listingQualityScore(listing.imageCount, listing.descriptionLength) +
    RANKING_WEIGHTS.promotedBoost * (listing.promoted ? 1 : 0)
  );
}

export function rankListings<T extends RankableListing>(
  ctx: BrowseContext,
  listings: T[],
): T[] {
  return [...listings].sort((a, b) => scoreListing(ctx, b) - scoreListing(ctx, a));
}
