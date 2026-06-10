import { asc, eq } from "drizzle-orm";

import { getDb } from "@/server/db/connection";
import { marketConfigs, type MarketConfig } from "@/server/db/schema";
import { readCache, writeCache, deleteCache } from "@/server/platform/cache";

export type DistanceUnit = "km" | "mi";

export type MarketConfigInput = {
  countryCode: string;
  enabledForBrowsing?: boolean;
  enabledForListings?: boolean;
  enabledForManualShipping?: boolean;
  enabledForProtectedPayments?: boolean;
  defaultCurrencyCode?: string;
  distanceUnit?: DistanceUnit;
};

const MARKET_CACHE_KEY = "markets:all";

/**
 * Launch markets. The marketplace is global, so any country can still be
 * browsed; these rows only set per-country defaults (currency, distance unit)
 * and gate optional capabilities such as future protected payments.
 */
export const defaultMarketConfigs: Array<
  Required<Omit<MarketConfigInput, "enabledForProtectedPayments">> & {
    enabledForProtectedPayments: boolean;
  }
> = [
  m("US", "USD", "mi"),
  m("CA", "CAD", "km"),
  m("GB", "GBP", "mi"),
  m("MA", "MAD", "km"),
  m("FR", "EUR", "km"),
  m("ES", "EUR", "km"),
  m("DE", "EUR", "km"),
  m("IT", "EUR", "km"),
  m("NL", "EUR", "km"),
  m("BE", "EUR", "km"),
  m("PT", "EUR", "km"),
  m("IE", "EUR", "km"),
  m("AU", "AUD", "km"),
];

function m(countryCode: string, defaultCurrencyCode: string, distanceUnit: DistanceUnit) {
  return {
    countryCode,
    defaultCurrencyCode,
    distanceUnit,
    enabledForBrowsing: true,
    enabledForListings: true,
    enabledForManualShipping: true,
    enabledForProtectedPayments: false,
  };
}

export async function seedMarketConfigs() {
  const db = getDb();
  await db
    .insert(marketConfigs)
    .values(defaultMarketConfigs)
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  await deleteCache(MARKET_CACHE_KEY);
}

export async function listMarketConfigs(): Promise<MarketConfig[]> {
  const cached = await readCache<MarketConfig[]>(MARKET_CACHE_KEY);
  if (Array.isArray(cached)) return cached;
  if (cached) await deleteCache(MARKET_CACHE_KEY);

  const rows = await getDb()
    .select()
    .from(marketConfigs)
    .orderBy(asc(marketConfigs.countryCode));
  await writeCache(MARKET_CACHE_KEY, rows, 300);
  return rows;
}

export async function getMarketConfig(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  const rows = await listMarketConfigs();
  if (!Array.isArray(rows)) return null;
  return rows.find((row) => row.countryCode === code) ?? null;
}

export async function distanceUnitForCountry(countryCode: string): Promise<DistanceUnit> {
  const market = await getMarketConfig(countryCode);
  return market?.distanceUnit ?? "km";
}

export async function upsertMarketConfig(input: MarketConfigInput) {
  const db = getDb();
  const countryCode = input.countryCode.trim().toUpperCase();
  const values = {
    countryCode,
    enabledForBrowsing: input.enabledForBrowsing ?? true,
    enabledForListings: input.enabledForListings ?? true,
    enabledForManualShipping: input.enabledForManualShipping ?? true,
    enabledForProtectedPayments: input.enabledForProtectedPayments ?? false,
    defaultCurrencyCode: (input.defaultCurrencyCode ?? "USD").toUpperCase(),
    distanceUnit: input.distanceUnit ?? "km",
  };
  await db
    .insert(marketConfigs)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        enabledForBrowsing: values.enabledForBrowsing,
        enabledForListings: values.enabledForListings,
        enabledForManualShipping: values.enabledForManualShipping,
        enabledForProtectedPayments: values.enabledForProtectedPayments,
        defaultCurrencyCode: values.defaultCurrencyCode,
        distanceUnit: values.distanceUnit,
        updatedAt: new Date(),
      },
    });
  await deleteCache(MARKET_CACHE_KEY);
  return getMarketConfig(countryCode);
}

export async function setMarketEnabled(
  countryCode: string,
  field: keyof Pick<
    MarketConfig,
    | "enabledForBrowsing"
    | "enabledForListings"
    | "enabledForManualShipping"
    | "enabledForProtectedPayments"
  >,
  enabled: boolean,
) {
  const db = getDb();
  await db
    .update(marketConfigs)
    .set({ [field]: enabled, updatedAt: new Date() })
    .where(eq(marketConfigs.countryCode, countryCode.trim().toUpperCase()));
  await deleteCache(MARKET_CACHE_KEY);
}
