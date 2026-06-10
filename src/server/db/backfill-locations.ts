import { config } from "dotenv";
import { and, eq, isNull } from "drizzle-orm";

import { closeDb, getDb } from "./connection";
import { books } from "./schema";
import { seedMarketConfigs } from "../domain/markets";
import { sampleCities, seedSampleLocations } from "./seed-locations";
import { normalizePlaceName } from "@/lib/geo";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

/**
 * Idempotent backfill: ensures markets + sample locations exist and assigns a
 * normalized location to every listing that does not have one yet. Existing
 * listings created before the location system used free-text country/city.
 */
async function main() {
  const db = getDb();
  await seedMarketConfigs();
  const locationsByKey = await seedSampleLocations();

  const cityByKey = new Map(sampleCities.map((city) => [city.key, city]));
  const keyByNormalized = new Map(
    sampleCities.map((city) => [`${city.countryCode}:${normalizePlaceName(city.cityName)}`, city.key]),
  );
  const sampleKeys = sampleCities.map((city) => city.key);

  const rows = await db
    .select({
      id: books.id,
      country: books.country,
      city: books.city,
      pickupAvailable: books.pickupAvailable,
      shippingMinor: books.shippingMinor,
      transactionType: books.transactionType,
    })
    .from(books)
    .where(isNull(books.locationId));

  console.log(`Backfilling ${rows.length} listings without a location...`);

  let index = 0;
  for (const row of rows) {
    const exactKey = keyByNormalized.get(`${row.country}:${normalizePlaceName(row.city)}`);
    const fallbackKey = sampleKeys[index % sampleKeys.length];
    const key = exactKey ?? fallbackKey;
    index += 1;

    const locationId = locationsByKey.get(key);
    const city = cityByKey.get(key);
    if (!locationId || !city) continue;

    const pickupEnabled = row.pickupAvailable;
    const manualShippingEnabled = row.shippingMinor > 0;
    const shippingScope = manualShippingEnabled
      ? row.transactionType === "sale"
        ? "worldwide"
        : "domestic_only"
      : "pickup_only";

    await db
      .update(books)
      .set({
        locationId,
        country: city.countryCode,
        city: city.cityName,
        pickupEnabled,
        manualShippingEnabled,
        shippingScope,
        pickupRadiusKm: pickupEnabled ? 25 : null,
      })
      .where(and(eq(books.id, row.id)));
  }

  console.log("Backfill complete.");
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
