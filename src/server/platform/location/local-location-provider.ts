import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";

import { getDb } from "@/server/db/connection";
import { locations, type Location } from "@/server/db/schema";
import {
  encodeGeohash,
  geohashNeighbors,
  haversineKm,
  normalizePlaceName,
} from "@/lib/geo";
import { formatLocationLabel } from "@/lib/location-format";
import type { LocationProvider } from "./location-provider";
import type {
  PlaceSuggestion,
  ResolvedPlace,
  ReverseGeocodeResult,
  SearchPlacesOptions,
} from "./types";

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 10;
const REVERSE_GEOCODE_PRECISION = 5;

function escapeLike(value: string) {
  return value.replace(/[!%_]/g, "!$&");
}

function toResolvedPlace(row: Location): ResolvedPlace {
  return {
    locationId: row.id,
    publicId: row.publicId,
    placeType: row.placeType,
    countryCode: row.countryCode,
    regionCode: row.regionCode,
    cityName: row.cityName,
    latitude: row.latitude,
    longitude: row.longitude,
    geohash: row.geohash,
    label: formatLocationLabel(row),
  };
}

/**
 * Phase 1 location provider backed by the local `locations` catalogue. Uses
 * indexed prefix search for autocomplete and geohash cells for reverse
 * geocoding so we never scan the whole catalogue.
 */
export class LocalLocationProvider implements LocationProvider {
  async searchPlaces(query: string, options: SearchPlacesOptions = {}): Promise<PlaceSuggestion[]> {
    const normalized = normalizePlaceName(query);
    if (normalized.length < MIN_QUERY_LENGTH) return [];

    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const pattern = `${escapeLike(normalized)}%`;
    const conditions = [
      eq(locations.placeType, "city"),
      eq(locations.isActive, true),
      or(
        sql`${locations.normalizedCityName} LIKE ${pattern} ESCAPE '!'`,
        sql`${locations.asciiCityName} LIKE ${pattern} ESCAPE '!'`,
      )!,
    ];
    const country = options.countryCode?.trim().toUpperCase();
    if (country) {
      conditions.push(eq(locations.countryCode, country));
    }

    const rows = await getDb()
      .select()
      .from(locations)
      .where(and(...conditions))
      .orderBy(desc(locations.population))
      .limit(limit);

    return rows.map((row) => ({
      locationId: row.id,
      publicId: row.publicId,
      label: formatLocationLabel(row),
      cityName: row.cityName,
      regionCode: row.regionCode,
      countryCode: row.countryCode,
      placeType: row.placeType,
      population: row.population,
    }));
  }

  async resolvePlace(input: {
    locationId?: number;
    publicId?: string;
    sourceExternalId?: string;
  }): Promise<ResolvedPlace | null> {
    const condition = input.locationId
      ? eq(locations.id, input.locationId)
      : input.publicId
        ? eq(locations.publicId, input.publicId)
        : input.sourceExternalId
          ? eq(locations.sourceExternalId, input.sourceExternalId)
          : null;
    if (!condition) return null;

    const [row] = await getDb().select().from(locations).where(condition).limit(1);
    return row ? toResolvedPlace(row) : null;
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
    const cell = encodeGeohash(latitude, longitude, REVERSE_GEOCODE_PRECISION);
    const cells = geohashNeighbors(cell);
    const cellConditions = cells.map(
      (prefix) => sql`${locations.geohash} LIKE ${`${prefix}%`}`,
    );

    const rows = await getDb()
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.placeType, "city"),
          eq(locations.isActive, true),
          isNotNull(locations.geohash),
          or(...cellConditions)!,
        ),
      )
      .limit(200);

    let nearest: { row: Location; distanceKm: number } | null = null;
    for (const row of rows) {
      if (row.latitude === null || row.longitude === null) continue;
      const distanceKm = haversineKm(latitude, longitude, row.latitude, row.longitude);
      if (!nearest || distanceKm < nearest.distanceKm) {
        nearest = { row, distanceKm };
      }
    }

    if (!nearest) return null;
    return { ...toResolvedPlace(nearest.row), distanceKm: nearest.distanceKm };
  }
}
