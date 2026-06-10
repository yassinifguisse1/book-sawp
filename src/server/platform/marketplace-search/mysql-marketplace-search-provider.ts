import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db/connection";
import {
  books,
  categories,
  listingShippingDestinations,
  locations,
  users,
} from "@/server/db/schema";
import {
  approximateDistanceLabel,
  encodeGeohash,
  geohashNeighbors,
  geohashPrecisionForRadiusKm,
} from "@/lib/geo";
import { formatLocationLabel, countryName } from "@/lib/location-format";
import { toMajorUnits } from "@/server/domain/validation";
import { distanceUnitForCountry } from "@/server/domain/markets";
import {
  classifyGroup,
  pickupDistanceKm,
  shipsToBrowseCountry,
  type BrowseContext,
  type DiscoveryGroup,
  type ListingLocationFacts,
} from "@/server/domain/search-eligibility";
import { rankListings, type RankableListing } from "@/server/domain/marketplace-ranking";
import { getLocationProvider } from "@/server/platform/location";
import type { PlaceSuggestion, SearchPlacesOptions } from "@/server/platform/location";
import type { MarketplaceSearchProvider } from "./marketplace-search-provider";
import type {
  DiscoveryFilters,
  DiscoveryGroupResult,
  DiscoveryListing,
  DiscoveryRequest,
  DiscoveryResult,
  DiscoverySort,
} from "./types";

const CANDIDATE_CAP = 300;
const SPARSE_NEARBY_THRESHOLD = 3;

type CandidateRow = {
  book: typeof books.$inferSelect;
  owner: { publicId: string; name: string | null; avatar: string | null };
  loc: {
    countryCode: string;
    regionCode: string | null;
    cityName: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

function escapeLike(value: string) {
  return `%${value.trim().replace(/[!%_]/g, "!$&")}%`;
}

export class MysqlMarketplaceSearchProvider implements MarketplaceSearchProvider {
  async getLocationSuggestions(
    query: string,
    options?: SearchPlacesOptions,
  ): Promise<PlaceSuggestion[]> {
    return getLocationProvider().searchPlaces(query, options);
  }

  async getNearbyListings(request: DiscoveryRequest): Promise<DiscoveryGroupResult> {
    const result = await this.searchListings(request);
    return result.nearYou;
  }

  async getListingsShippableTo(
    countryCode: string,
    request: DiscoveryRequest,
  ): Promise<DiscoveryGroupResult> {
    const result = await this.searchListings({
      ...request,
      browse: { ...request.browse, countryCode: countryCode.trim().toUpperCase() },
    });
    return { ...result.international };
  }

  async searchListings(request: DiscoveryRequest): Promise<DiscoveryResult> {
    const { browse, filters, sort, perGroupLimit } = request;
    const candidates = await this.fetchCandidates(browse, filters);
    const shippingDestinations = await this.loadShippingDestinations(candidates);

    const grouped: Record<DiscoveryGroup, DiscoveryRanked[]> = {
      nearYou: [],
      inCountry: [],
      international: [],
    };

    for (const candidate of candidates) {
      const facts = this.toFacts(candidate, shippingDestinations);
      const distanceKm = pickupDistanceKm(browse, facts);
      const group = classifyGroup(browse, facts, distanceKm);
      if (!group) continue;

      if (filters.localOnly && group !== "nearYou") continue;
      if (filters.sameCountryOnly && group === "international") continue;

      grouped[group].push({
        candidate,
        facts,
        distanceKm,
        shipsToYou: shipsToBrowseCountry(browse, facts),
        rankable: this.toRankable(candidate, facts, filters.search),
      });
    }

    let distanceUnit: "km" | "mi" = "km";
    try {
      distanceUnit = await distanceUnitForCountry(browse.countryCode);
    } catch (error) {
      console.error("discovery.distanceUnitForCountry failed", error);
    }
    const nearYou = this.finalizeGroup(browse, grouped.nearYou, sort, perGroupLimit, distanceUnit);
    const inCountry = this.finalizeGroup(
      browse,
      grouped.inCountry,
      sort,
      perGroupLimit,
      distanceUnit,
    );
    const international = this.finalizeGroup(
      browse,
      grouped.international,
      sort,
      perGroupLimit,
      distanceUnit,
    );

    return {
      nearYou,
      inCountry,
      international,
      meta: {
        countryCode: browse.countryCode,
        countryName: countryName(browse.countryCode),
        radiusKm: browse.radiusKm,
        distanceUnit,
        totalEligible: nearYou.total + inCountry.total + international.total,
        sparseNearby: nearYou.total < SPARSE_NEARBY_THRESHOLD,
      },
    };
  }

  private baseConditions(filters: DiscoveryFilters) {
    const conditions = [
      eq(books.status, "active"),
      isNull(books.deletedAt),
      isNull(books.suspendedAt),
    ];
    if (filters.transactionType) conditions.push(eq(books.transactionType, filters.transactionType));
    if (filters.condition) conditions.push(eq(books.condition, filters.condition));
    if (filters.educationLevel) conditions.push(eq(books.educationLevel, filters.educationLevel));
    if (filters.schoolType) conditions.push(eq(books.schoolType, filters.schoolType));
    if (filters.language) conditions.push(eq(books.language, filters.language));
    if (filters.genre) conditions.push(eq(books.genre, filters.genre));
    if (filters.categorySlug) conditions.push(eq(categories.slug, filters.categorySlug));
    if (filters.deliveryMode === "pickup") conditions.push(eq(books.pickupEnabled, true));
    if (filters.deliveryMode === "ship") conditions.push(eq(books.manualShippingEnabled, true));
    if (filters.search?.trim()) {
      const pattern = escapeLike(filters.search);
      conditions.push(
        or(
          sql`${books.title} LIKE ${pattern} ESCAPE '!'`,
          sql`${books.author} LIKE ${pattern} ESCAPE '!'`,
          sql`${books.genre} LIKE ${pattern} ESCAPE '!'`,
          sql`${books.isbn} LIKE ${pattern} ESCAPE '!'`,
        )!,
      );
    }
    return conditions;
  }

  private candidateQuery(extra: ReturnType<typeof and> | undefined, baseConditions: ReturnType<typeof eq>[]) {
    return getDb()
      .select({
        book: books,
        owner: { publicId: users.publicId, name: users.name, avatar: users.avatar },
        loc: {
          countryCode: locations.countryCode,
          regionCode: locations.regionCode,
          cityName: locations.cityName,
          latitude: locations.latitude,
          longitude: locations.longitude,
        },
      })
      .from(books)
      .innerJoin(users, eq(books.ownerId, users.id))
      .leftJoin(locations, eq(books.locationId, locations.id))
      .leftJoin(categories, eq(books.categoryId, categories.id))
      .where(extra ? and(extra, ...baseConditions) : and(...baseConditions))
      .orderBy(desc(books.createdAt))
      .limit(CANDIDATE_CAP);
  }

  private async fetchCandidates(
    browse: BrowseContext,
    filters: DiscoveryFilters,
  ): Promise<CandidateRow[]> {
    const base = this.baseConditions(filters);
    const merged = new Map<number, CandidateRow>();

    const queries: Array<Promise<CandidateRow[]>> = [];

    // Nearby pickup candidates via geohash cells (indexed, no full scan).
    if (browse.latitude !== null && browse.longitude !== null && browse.radiusKm !== null) {
      const precision = geohashPrecisionForRadiusKm(browse.radiusKm);
      const cells = geohashNeighbors(encodeGeohash(browse.latitude, browse.longitude, precision));
      const cellCondition = or(
        ...cells.map((cell) => sql`${locations.geohash} LIKE ${`${cell}%`}`),
      )!;
      queries.push(
        this.candidateQuery(and(eq(books.pickupEnabled, true), cellCondition), base) as Promise<
          CandidateRow[]
        >,
      );
    }

    // Same-country candidates (indexed on country).
    if (!filters.localOnly) {
      queries.push(
        this.candidateQuery(eq(books.country, browse.countryCode), base) as Promise<CandidateRow[]>,
      );
    }

    // International candidates.
    if (!filters.localOnly && !filters.sameCountryOnly) {
      if (browse.includeInternationalShipping) {
        queries.push(
          this.candidateQuery(ne(books.country, browse.countryCode), base) as Promise<
            CandidateRow[]
          >,
        );
      } else {
        const destIds = await getDb()
          .select({ id: listingShippingDestinations.listingId })
          .from(listingShippingDestinations)
          .where(eq(listingShippingDestinations.countryCode, browse.countryCode))
          .limit(CANDIDATE_CAP);
        const ids = destIds.map((row) => row.id);
        const shippableCondition = ids.length
          ? or(eq(books.shippingScope, "worldwide"), inArray(books.id, ids))!
          : eq(books.shippingScope, "worldwide");
        queries.push(
          this.candidateQuery(
            and(ne(books.country, browse.countryCode), shippableCondition),
            base,
          ) as Promise<CandidateRow[]>,
        );
      }
    }

    const resultSets = await Promise.all(queries);
    for (const rows of resultSets) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!merged.has(row.book.id)) merged.set(row.book.id, row);
      }
    }
    return [...merged.values()];
  }

  private async loadShippingDestinations(
    candidates: CandidateRow[],
  ): Promise<Map<number, Set<string>>> {
    const selectedIds = candidates
      .filter((candidate) => candidate.book.shippingScope === "selected_countries")
      .map((candidate) => candidate.book.id);
    const destinations = new Map<number, Set<string>>();
    if (selectedIds.length === 0) return destinations;

    const rows = await getDb()
      .select({
        listingId: listingShippingDestinations.listingId,
        countryCode: listingShippingDestinations.countryCode,
      })
      .from(listingShippingDestinations)
      .where(inArray(listingShippingDestinations.listingId, selectedIds));
    if (!Array.isArray(rows)) return destinations;

    for (const row of rows) {
      const codes = destinations.get(row.listingId) ?? new Set<string>();
      codes.add(row.countryCode);
      destinations.set(row.listingId, codes);
    }
    return destinations;
  }

  private toFacts(
    candidate: CandidateRow,
    shippingDestinations: Map<number, Set<string>>,
  ): ListingLocationFacts {
    const { book, loc } = candidate;
    return {
      countryCode: loc?.countryCode ?? book.country,
      regionCode: loc?.regionCode ?? null,
      cityName: loc?.cityName ?? book.city,
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      pickupEnabled: book.pickupEnabled,
      pickupRadiusKm: book.pickupRadiusKm,
      manualShippingEnabled: book.manualShippingEnabled,
      shippingScope: book.shippingScope,
      shipsToCountryCodes:
        book.shippingScope === "selected_countries"
          ? new Set(shippingDestinations.get(book.id) ?? [])
          : new Set(),
    };
  }

  private textScoreFor(candidate: CandidateRow, search?: string): number {
    if (!search?.trim()) return 1;
    const term = search.trim().toLowerCase();
    const title = candidate.book.title.toLowerCase();
    const author = candidate.book.author.toLowerCase();
    const genre = candidate.book.genre.toLowerCase();
    if (title.startsWith(term)) return 1;
    if (title.includes(term)) return 0.85;
    if (author.includes(term)) return 0.6;
    if (genre.includes(term)) return 0.45;
    return 0.25;
  }

  private toRankable(
    candidate: CandidateRow,
    facts: ListingLocationFacts,
    search?: string,
  ): RankableListing {
    const imageCount = candidate.book.imageUrls?.length ?? (candidate.book.imageUrl ? 1 : 0);
    return {
      facts,
      createdAt: candidate.book.createdAt,
      imageCount,
      descriptionLength: candidate.book.description?.length ?? 0,
      textScore: this.textScoreFor(candidate, search),
      sellerTrustScore: 0,
      promoted: false,
    };
  }

  private finalizeGroup(
    browse: BrowseContext,
    entries: DiscoveryRanked[],
    sort: DiscoverySort,
    perGroupLimit: number,
    distanceUnit: "km" | "mi",
  ): DiscoveryGroupResult {
    const sorted = this.sortEntries(browse, entries, sort);
    const total = sorted.length;
    const items = sorted
      .slice(0, perGroupLimit)
      .map((entry) => this.toListing(entry, distanceUnit));
    return { items, total };
  }

  private sortEntries(
    browse: BrowseContext,
    entries: DiscoveryRanked[],
    sort: DiscoverySort,
  ): DiscoveryRanked[] {
    switch (sort) {
      case "recent":
        return [...entries].sort(
          (a, b) => b.candidate.book.createdAt.getTime() - a.candidate.book.createdAt.getTime(),
        );
      case "price_asc":
        return [...entries].sort(
          (a, b) => (a.candidate.book.priceMinor ?? Infinity) - (b.candidate.book.priceMinor ?? Infinity),
        );
      case "price_desc":
        return [...entries].sort(
          (a, b) => (b.candidate.book.priceMinor ?? -1) - (a.candidate.book.priceMinor ?? -1),
        );
      case "distance":
        return [...entries].sort(
          (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
        );
      case "relevance":
      default: {
        const ranked = rankListings(
          browse,
          entries.map((entry) => entry.rankable),
        );
        const order = new Map(ranked.map((rankable, index) => [rankable, index]));
        return [...entries].sort(
          (a, b) => (order.get(a.rankable) ?? 0) - (order.get(b.rankable) ?? 0),
        );
      }
    }
  }

  private toListing(entry: DiscoveryRanked, distanceUnit: "km" | "mi"): DiscoveryListing {
    const { candidate, facts, distanceKm } = entry;
    const { book, owner } = candidate;
    const displayLocation = formatLocationLabel({
      cityName: facts.cityName,
      regionCode: facts.regionCode,
      countryCode: facts.countryCode,
    });
    return {
      id: book.id,
      publicId: book.publicId,
      title: book.title,
      author: book.author,
      genre: book.genre,
      condition: book.condition,
      transactionType: book.transactionType,
      status: book.status,
      currency: book.currency,
      price: toMajorUnits(book.priceMinor),
      shippingCost: toMajorUnits(book.shippingMinor) ?? "0.00",
      imageUrl: book.imageUrl,
      imageUrls: book.imageUrls,
      createdAt: book.createdAt,
      displayLocation,
      regionCode: facts.regionCode,
      countryCode: facts.countryCode,
      approximateDistanceKm: distanceKm === null ? null : Math.round(distanceKm),
      distanceLabel: distanceKm === null ? null : approximateDistanceLabel(distanceKm, distanceUnit),
      pickupAvailable: facts.pickupEnabled,
      shipsToYou: entry.shipsToYou,
      owner,
    };
  }
}

type DiscoveryRanked = {
  candidate: CandidateRow;
  facts: ListingLocationFacts;
  distanceKm: number | null;
  shipsToYou: boolean;
  rankable: RankableListing;
};
