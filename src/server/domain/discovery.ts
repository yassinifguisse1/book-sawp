import { countryName } from "@/lib/location-format";
import { getLocationProvider } from "@/server/platform/location";
import {
  getMarketplaceSearchProvider,
  type DiscoveryFilters,
  type DiscoveryResult,
  type DiscoverySort,
} from "@/server/platform/marketplace-search";
import type { BrowseContext } from "@/server/domain/search-eligibility";
import { deleteCache, readCache, writeCache } from "@/server/platform/cache";

const DEFAULT_COUNTRY = "US";
const DEFAULT_RADIUS_KM = 25;
const DISCOVERY_CACHE_TTL_SECONDS = 45;

export type RunDiscoveryInput = {
  locationId?: number;
  countryCode?: string;
  /** undefined -> default radius, null -> any distance. */
  radiusKm?: number | null;
  includeDomesticShipping: boolean;
  includeInternationalShipping: boolean;
  filters: DiscoveryFilters;
  sort: DiscoverySort;
  perGroupLimit: number;
};

async function resolveBrowseContext(input: RunDiscoveryInput): Promise<BrowseContext> {
  let countryCode = input.countryCode?.trim().toUpperCase() || DEFAULT_COUNTRY;
  let regionCode: string | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;

  if (input.locationId) {
    const place = await getLocationProvider().resolvePlace({ locationId: input.locationId });
    if (place) {
      countryCode = place.countryCode;
      regionCode = place.regionCode;
      latitude = place.latitude;
      longitude = place.longitude;
    }
  }

  return {
    countryCode,
    regionCode,
    latitude,
    longitude,
    radiusKm: input.radiusKm === undefined ? DEFAULT_RADIUS_KM : input.radiusKm,
    includeDomesticShipping: input.includeDomesticShipping,
    includeInternationalShipping: input.includeInternationalShipping,
  };
}

function discoveryCacheKey(browse: BrowseContext, input: RunDiscoveryInput) {
  return `discovery:${JSON.stringify({ browse, filters: input.filters, sort: input.sort, perGroupLimit: input.perGroupLimit })}`;
}

function isDiscoveryResult(value: unknown): value is DiscoveryResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as DiscoveryResult;
  return (
    Array.isArray(candidate.nearYou?.items) &&
    Array.isArray(candidate.inCountry?.items) &&
    Array.isArray(candidate.international?.items) &&
    typeof candidate.meta?.countryCode === "string"
  );
}

/** Safe fallback when discovery dependencies fail — keeps the home page usable. */
export function emptyDiscoveryResult(
  countryCode: string,
  radiusKm: number | null = DEFAULT_RADIUS_KM,
): DiscoveryResult {
  const code = countryCode.trim().toUpperCase() || DEFAULT_COUNTRY;
  return {
    nearYou: { items: [], total: 0 },
    inCountry: { items: [], total: 0 },
    international: { items: [], total: 0 },
    meta: {
      countryCode: code,
      countryName: countryName(code),
      radiusKm,
      distanceUnit: "km",
      totalEligible: 0,
      sparseNearby: true,
    },
  };
}

export async function runDiscovery(input: RunDiscoveryInput): Promise<DiscoveryResult> {
  let browse: BrowseContext;
  try {
    browse = await resolveBrowseContext(input);
  } catch (error) {
    console.error("discovery.resolveBrowseContext failed", error);
    return emptyDiscoveryResult(input.countryCode ?? DEFAULT_COUNTRY, input.radiusKm ?? DEFAULT_RADIUS_KM);
  }

  const cacheKey = discoveryCacheKey(browse, input);
  const cached = await readCache<DiscoveryResult>(cacheKey);
  if (isDiscoveryResult(cached)) return cached;
  if (cached) await deleteCache(cacheKey);

  try {
    const result = await getMarketplaceSearchProvider().searchListings({
      browse,
      filters: input.filters,
      sort: input.sort,
      perGroupLimit: input.perGroupLimit,
    });
    await writeCache(cacheKey, result, DISCOVERY_CACHE_TTL_SECONDS);
    return result;
  } catch (error) {
    console.error("discovery.searchListings failed", error);
    return emptyDiscoveryResult(browse.countryCode, browse.radiusKm);
  }
}
