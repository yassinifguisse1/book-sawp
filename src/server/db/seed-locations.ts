import { like } from "drizzle-orm";

import { getDb } from "./connection";
import { locations } from "./schema";
import { asciiPlaceName, encodeGeohash, normalizePlaceName } from "@/lib/geo";

type SampleCity = {
  key: string;
  cityName: string;
  countryCode: string;
  regionCode: string;
  latitude: number;
  longitude: number;
};

/**
 * A small curated set of cities so local development has a working location
 * catalogue without downloading the full GeoNames dataset. Production should
 * run `npm run locations:import`.
 */
export const sampleCities: SampleCity[] = [
  { key: "portland-or", cityName: "Portland", countryCode: "US", regionCode: "OR", latitude: 45.5234, longitude: -122.6762 },
  { key: "seattle-wa", cityName: "Seattle", countryCode: "US", regionCode: "WA", latitude: 47.6062, longitude: -122.3321 },
  { key: "san-francisco-ca", cityName: "San Francisco", countryCode: "US", regionCode: "CA", latitude: 37.7749, longitude: -122.4194 },
  { key: "austin-tx", cityName: "Austin", countryCode: "US", regionCode: "TX", latitude: 30.2672, longitude: -97.7431 },
  { key: "new-york-ny", cityName: "New York", countryCode: "US", regionCode: "NY", latitude: 40.7128, longitude: -74.006 },
  { key: "los-angeles-ca", cityName: "Los Angeles", countryCode: "US", regionCode: "CA", latitude: 34.0522, longitude: -118.2437 },
  { key: "chicago-il", cityName: "Chicago", countryCode: "US", regionCode: "IL", latitude: 41.8781, longitude: -87.6298 },
  { key: "boston-ma", cityName: "Boston", countryCode: "US", regionCode: "MA", latitude: 42.3601, longitude: -71.0589 },
  { key: "denver-co", cityName: "Denver", countryCode: "US", regionCode: "CO", latitude: 39.7392, longitude: -104.9903 },
  { key: "miami-fl", cityName: "Miami", countryCode: "US", regionCode: "FL", latitude: 25.7617, longitude: -80.1918 },
  { key: "atlanta-ga", cityName: "Atlanta", countryCode: "US", regionCode: "GA", latitude: 33.749, longitude: -84.388 },
  { key: "philadelphia-pa", cityName: "Philadelphia", countryCode: "US", regionCode: "PA", latitude: 39.9526, longitude: -75.1652 },
  { key: "dallas-tx", cityName: "Dallas", countryCode: "US", regionCode: "TX", latitude: 32.7767, longitude: -96.797 },
  { key: "houston-tx", cityName: "Houston", countryCode: "US", regionCode: "TX", latitude: 29.7604, longitude: -95.3698 },
  { key: "london-gb", cityName: "London", countryCode: "GB", regionCode: "ENG", latitude: 51.5074, longitude: -0.1278 },
  { key: "manchester-gb", cityName: "Manchester", countryCode: "GB", regionCode: "ENG", latitude: 53.4808, longitude: -2.2426 },
  { key: "birmingham-gb", cityName: "Birmingham", countryCode: "GB", regionCode: "ENG", latitude: 52.4862, longitude: -1.8904 },
  { key: "paris-fr", cityName: "Paris", countryCode: "FR", regionCode: "IDF", latitude: 48.8566, longitude: 2.3522 },
  { key: "lyon-fr", cityName: "Lyon", countryCode: "FR", regionCode: "ARA", latitude: 45.764, longitude: 4.8357 },
  { key: "marseille-fr", cityName: "Marseille", countryCode: "FR", regionCode: "PAC", latitude: 43.2965, longitude: 5.3698 },
  { key: "berlin-de", cityName: "Berlin", countryCode: "DE", regionCode: "BE", latitude: 52.52, longitude: 13.405 },
  { key: "hamburg-de", cityName: "Hamburg", countryCode: "DE", regionCode: "HH", latitude: 53.5511, longitude: 9.9937 },
  { key: "munich-de", cityName: "Munich", countryCode: "DE", regionCode: "BY", latitude: 48.1351, longitude: 11.582 },
  { key: "toronto-ca", cityName: "Toronto", countryCode: "CA", regionCode: "ON", latitude: 43.6532, longitude: -79.3832 },
  { key: "vancouver-ca", cityName: "Vancouver", countryCode: "CA", regionCode: "BC", latitude: 49.2827, longitude: -123.1207 },
  { key: "montreal-ca", cityName: "Montreal", countryCode: "CA", regionCode: "QC", latitude: 45.5017, longitude: -73.5673 },
  { key: "sydney-au", cityName: "Sydney", countryCode: "AU", regionCode: "NSW", latitude: -33.8688, longitude: 151.2093 },
  { key: "melbourne-au", cityName: "Melbourne", countryCode: "AU", regionCode: "VIC", latitude: -37.8136, longitude: 144.9631 },
  { key: "casablanca-ma", cityName: "Casablanca", countryCode: "MA", regionCode: "06", latitude: 33.5731, longitude: -7.5898 },
];

export async function seedSampleLocations(): Promise<Map<string, number>> {
  const db = getDb();
  await db
    .insert(locations)
    .values(
      sampleCities.map((city) => ({
        sourceExternalId: `seed:${city.key}`,
        placeType: "city" as const,
        countryCode: city.countryCode,
        regionCode: city.regionCode,
        cityName: city.cityName,
        normalizedCityName: normalizePlaceName(city.cityName),
        asciiCityName: asciiPlaceName(city.cityName),
        latitude: city.latitude,
        longitude: city.longitude,
        geohash: encodeGeohash(city.latitude, city.longitude, 9),
        population: 500000,
        isActive: true,
      })),
    )
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

  const rows = await db
    .select({ id: locations.id, sourceExternalId: locations.sourceExternalId })
    .from(locations)
    .where(like(locations.sourceExternalId, "seed:%"));
  const byKey = new Map<string, number>();
  for (const row of rows) {
    if (row.sourceExternalId) {
      byKey.set(row.sourceExternalId.slice("seed:".length), row.id);
    }
  }
  return byKey;
}
