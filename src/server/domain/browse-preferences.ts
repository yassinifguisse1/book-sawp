import { eq } from "drizzle-orm";

import { getDb } from "@/server/db/connection";
import {
  locations,
  userBrowsePreferences,
  userProfileLocations,
} from "@/server/db/schema";
import { formatLocationLabel } from "@/lib/location-format";

export type LocationSource =
  | "manual_selection"
  | "profile_default"
  | "browser_geolocation"
  | "ip_suggestion";

export type BrowsePreferenceView = {
  browseLocationId: number | null;
  label: string | null;
  countryCode: string | null;
  regionCode: string | null;
  cityName: string | null;
  radiusKm: number;
  includeDomesticShipping: boolean;
  includeInternationalShipping: boolean;
  locationSource: LocationSource;
};

export type SaveBrowsePreferenceInput = {
  browseLocationId?: number | null;
  radiusKm?: number;
  includeDomesticShipping?: boolean;
  includeInternationalShipping?: boolean;
  locationSource?: LocationSource;
};

export async function getUserBrowsePreference(
  userId: number,
): Promise<BrowsePreferenceView | null> {
  const [row] = await getDb()
    .select({
      browseLocationId: userBrowsePreferences.browseLocationId,
      radiusKm: userBrowsePreferences.radiusKm,
      includeDomesticShipping: userBrowsePreferences.includeDomesticShipping,
      includeInternationalShipping: userBrowsePreferences.includeInternationalShipping,
      locationSource: userBrowsePreferences.locationSource,
      countryCode: locations.countryCode,
      regionCode: locations.regionCode,
      cityName: locations.cityName,
    })
    .from(userBrowsePreferences)
    .leftJoin(locations, eq(userBrowsePreferences.browseLocationId, locations.id))
    .where(eq(userBrowsePreferences.userId, userId))
    .limit(1);

  if (!row) return null;
  return {
    browseLocationId: row.browseLocationId,
    label: row.cityName
      ? formatLocationLabel({
          cityName: row.cityName,
          regionCode: row.regionCode,
          countryCode: row.countryCode,
        })
      : null,
    countryCode: row.countryCode,
    regionCode: row.regionCode,
    cityName: row.cityName,
    radiusKm: row.radiusKm,
    includeDomesticShipping: row.includeDomesticShipping,
    includeInternationalShipping: row.includeInternationalShipping,
    locationSource: row.locationSource,
  };
}

export async function saveUserBrowsePreference(
  userId: number,
  input: SaveBrowsePreferenceInput,
): Promise<BrowsePreferenceView | null> {
  const db = getDb();
  const values = {
    userId,
    browseLocationId: input.browseLocationId ?? null,
    radiusKm: input.radiusKm ?? 25,
    includeDomesticShipping: input.includeDomesticShipping ?? true,
    includeInternationalShipping: input.includeInternationalShipping ?? false,
    locationSource: input.locationSource ?? "manual_selection",
  };

  await db
    .insert(userBrowsePreferences)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        browseLocationId: values.browseLocationId,
        radiusKm: values.radiusKm,
        includeDomesticShipping: values.includeDomesticShipping,
        includeInternationalShipping: values.includeInternationalShipping,
        locationSource: values.locationSource,
        updatedAt: new Date(),
      },
    });

  return getUserBrowsePreference(userId);
}

export async function getUserHomeLocationId(userId: number): Promise<number | null> {
  const [row] = await getDb()
    .select({ homeLocationId: userProfileLocations.homeLocationId })
    .from(userProfileLocations)
    .where(eq(userProfileLocations.userId, userId))
    .limit(1);
  return row?.homeLocationId ?? null;
}

export async function saveUserHomeLocation(userId: number, homeLocationId: number) {
  const db = getDb();
  await db
    .insert(userProfileLocations)
    .values({ userId, homeLocationId })
    .onDuplicateKeyUpdate({ set: { homeLocationId, updatedAt: new Date() } });
}
