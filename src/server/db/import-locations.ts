import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";

import { closeDb, getDb } from "./connection";
import { locations, type InsertLocation } from "./schema";
import { seedMarketConfigs } from "../domain/markets";
import {
  asciiPlaceName,
  encodeGeohash,
  normalizePlaceName,
} from "@/lib/geo";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const GEONAMES_BASE = "https://download.geonames.org/export/dump";
const DATA_DIR = path.join(process.cwd(), "data", "geonames");
const BATCH_SIZE = 1000;

type ImportStats = { inserted: number; updated: number; skipped: number };

function emptyStats(): ImportStats {
  return { inserted: 0, updated: 0, skipped: 0 };
}

async function fileExists(filePath: string) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureFile(fileName: string, allowDownload: boolean): Promise<Buffer | null> {
  const filePath = path.join(DATA_DIR, fileName);
  if (await fileExists(filePath)) {
    return readFile(filePath);
  }
  if (!allowDownload) {
    console.warn(`Missing ${fileName} and downloads are disabled; skipping.`);
    return null;
  }

  const url = `${GEONAMES_BASE}/${fileName}`;
  console.log(`Downloading ${url} ...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${fileName}: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, buffer);
  return buffer;
}

function extractFromZip(zipBuffer: Buffer, entryName: string): string {
  const zip = new AdmZip(zipBuffer);
  const entry = zip.getEntry(entryName);
  if (!entry) {
    throw new Error(`Entry ${entryName} not found in archive`);
  }
  return entry.getData().toString("utf8");
}

function buildLocationRow(partial: Omit<InsertLocation, "id" | "publicId">): InsertLocation {
  return partial as InsertLocation;
}

async function upsertBatch(rows: InsertLocation[], stats: ImportStats) {
  if (rows.length === 0) return;
  const db = getDb();
  const result = await db
    .insert(locations)
    .values(rows)
    .onDuplicateKeyUpdate({
      set: {
        placeType: sql`values(${locations.placeType})`,
        countryCode: sql`values(${locations.countryCode})`,
        regionCode: sql`values(${locations.regionCode})`,
        cityName: sql`values(${locations.cityName})`,
        normalizedCityName: sql`values(${locations.normalizedCityName})`,
        asciiCityName: sql`values(${locations.asciiCityName})`,
        latitude: sql`values(${locations.latitude})`,
        longitude: sql`values(${locations.longitude})`,
        geohash: sql`values(${locations.geohash})`,
        population: sql`values(${locations.population})`,
        updatedAt: new Date(),
      },
    });
  // mysql2 affectedRows: 1 per insert, 2 per update on duplicate-key.
  const affected = Array.isArray(result) ? Number(result[0]?.affectedRows ?? 0) : 0;
  const updated = Math.max(0, affected - rows.length);
  stats.inserted += rows.length - updated;
  stats.updated += updated;
}

async function importCountries(allowDownload: boolean): Promise<ImportStats> {
  const stats = emptyStats();
  const buffer = await ensureFile("countryInfo.txt", allowDownload);
  if (!buffer) return stats;

  const lines = buffer.toString("utf8").split("\n");
  let batch: InsertLocation[] = [];
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const cols = line.split("\t");
    const iso = cols[0]?.trim();
    const countryName = cols[4]?.trim();
    const geonameId = cols[16]?.trim();
    if (!iso || !countryName || !geonameId) {
      stats.skipped += 1;
      continue;
    }
    batch.push(
      buildLocationRow({
        sourceExternalId: geonameId,
        placeType: "country",
        countryCode: iso.toUpperCase(),
        regionCode: null,
        cityName: countryName,
        normalizedCityName: normalizePlaceName(countryName),
        asciiCityName: asciiPlaceName(countryName),
        latitude: null,
        longitude: null,
        geohash: null,
        population: 0,
        isActive: true,
      }),
    );
    if (batch.length >= BATCH_SIZE) {
      await upsertBatch(batch, stats);
      batch = [];
    }
  }
  await upsertBatch(batch, stats);
  return stats;
}

async function importRegions(allowDownload: boolean): Promise<ImportStats> {
  const stats = emptyStats();
  const buffer = await ensureFile("admin1CodesASCII.txt", allowDownload);
  if (!buffer) return stats;

  const lines = buffer.toString("utf8").split("\n");
  let batch: InsertLocation[] = [];
  for (const line of lines) {
    if (!line) continue;
    const cols = line.split("\t");
    const code = cols[0]?.trim(); // e.g. "US.OR"
    const name = cols[1]?.trim();
    const asciiName = cols[2]?.trim();
    const geonameId = cols[3]?.trim();
    if (!code || !name || !geonameId) {
      stats.skipped += 1;
      continue;
    }
    const [countryCode, regionCode] = code.split(".");
    if (!countryCode || !regionCode) {
      stats.skipped += 1;
      continue;
    }
    batch.push(
      buildLocationRow({
        sourceExternalId: geonameId,
        placeType: "region",
        countryCode: countryCode.toUpperCase(),
        regionCode,
        cityName: name,
        normalizedCityName: normalizePlaceName(name),
        asciiCityName: asciiPlaceName(asciiName || name),
        latitude: null,
        longitude: null,
        geohash: null,
        population: 0,
        isActive: true,
      }),
    );
    if (batch.length >= BATCH_SIZE) {
      await upsertBatch(batch, stats);
      batch = [];
    }
  }
  await upsertBatch(batch, stats);
  return stats;
}

async function importCities(allowDownload: boolean, citiesFile: string): Promise<ImportStats> {
  const stats = emptyStats();
  const zipBuffer = await ensureFile(`${citiesFile}.zip`, allowDownload);
  if (!zipBuffer) return stats;
  const text = extractFromZip(zipBuffer, `${citiesFile}.txt`);

  const lines = text.split("\n");
  let batch: InsertLocation[] = [];
  for (const line of lines) {
    if (!line) continue;
    const cols = line.split("\t");
    const geonameId = cols[0]?.trim();
    const name = cols[1]?.trim();
    const asciiName = cols[2]?.trim();
    const latitude = Number(cols[4]);
    const longitude = Number(cols[5]);
    const countryCode = cols[8]?.trim();
    const regionCode = cols[10]?.trim() || null;
    const population = Number(cols[14] ?? 0);
    if (!geonameId || !name || !countryCode || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      stats.skipped += 1;
      continue;
    }
    batch.push(
      buildLocationRow({
        sourceExternalId: geonameId,
        placeType: "city",
        countryCode: countryCode.toUpperCase(),
        regionCode,
        cityName: name,
        normalizedCityName: normalizePlaceName(name),
        asciiCityName: asciiPlaceName(asciiName || name),
        latitude,
        longitude,
        geohash: encodeGeohash(latitude, longitude, 9),
        population: Number.isFinite(population) ? population : 0,
        isActive: true,
      }),
    );
    if (batch.length >= BATCH_SIZE) {
      await upsertBatch(batch, stats);
      batch = [];
    }
  }
  await upsertBatch(batch, stats);
  return stats;
}

function parseArgs() {
  const allowDownload = !process.argv.includes("--no-download");
  const citiesArg = process.argv.find((arg) => arg.startsWith("--cities="));
  const citiesFile = citiesArg?.split("=")[1]?.trim() || "cities500";
  return { allowDownload, citiesFile };
}

async function main() {
  const { allowDownload, citiesFile } = parseArgs();
  const startedAt = Date.now();
  await mkdir(DATA_DIR, { recursive: true });

  console.log("Importing location catalogue from GeoNames...");
  console.log(`  data dir: ${DATA_DIR}`);
  console.log(`  cities file: ${citiesFile}`);
  console.log(`  downloads: ${allowDownload ? "enabled" : "disabled"}`);

  const countryStats = await importCountries(allowDownload);
  console.log(
    `Countries: +${countryStats.inserted} inserted, ${countryStats.updated} updated, ${countryStats.skipped} skipped`,
  );

  const regionStats = await importRegions(allowDownload);
  console.log(
    `Regions: +${regionStats.inserted} inserted, ${regionStats.updated} updated, ${regionStats.skipped} skipped`,
  );

  const cityStats = await importCities(allowDownload, citiesFile);
  console.log(
    `Cities: +${cityStats.inserted} inserted, ${cityStats.updated} updated, ${cityStats.skipped} skipped`,
  );

  await seedMarketConfigs();
  console.log("Market configurations seeded.");

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`Location import complete in ${elapsed}s.`);
}

main()
  .catch((error) => {
    console.error("Location import failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
