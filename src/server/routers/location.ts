import { z } from "zod";

import { createRouter, publicQuery } from "@/server/trpc";
import { getLocationProvider } from "@/server/platform/location";
import type { PlaceSuggestion, ResolvedPlace } from "@/server/platform/location";
import { assertPublicRateLimit } from "@/server/platform/rate-limit";
import { countryName } from "@/lib/location-format";

function toPublicSuggestion(place: PlaceSuggestion) {
  return {
    locationId: place.locationId,
    publicId: place.publicId,
    label: place.label,
    cityName: place.cityName,
    regionCode: place.regionCode,
    countryCode: place.countryCode,
    placeType: place.placeType,
  };
}

/** Public place view: never exposes exact coordinates or geohash. */
function toPublicResolved(place: ResolvedPlace) {
  return {
    locationId: place.locationId,
    publicId: place.publicId,
    label: place.label,
    cityName: place.cityName,
    regionCode: place.regionCode,
    countryCode: place.countryCode,
    placeType: place.placeType,
  };
}

export const locationRouter = createRouter({
  suggest: publicQuery
    .input(
      z.object({
        query: z.string().trim().min(2).max(80),
        countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPublicRateLimit("location.suggest", `ip:${ctx.ipAddress}`, {
        requests: 30,
        window: "1 m",
      });
      const places = await getLocationProvider().searchPlaces(input.query, {
        countryCode: input.countryCode,
        limit: 10,
      });
      return places.map(toPublicSuggestion);
    }),

  resolve: publicQuery
    .input(
      z.object({
        locationId: z.number().int().positive().optional(),
        publicId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ input }) => {
      if (!input.locationId && !input.publicId) return null;
      const place = await getLocationProvider().resolvePlace(input);
      return place ? toPublicResolved(place) : null;
    }),

  ipSuggestion: publicQuery.query(async ({ ctx }) => {
    const countryCode = ctx.geo.countryCode?.toUpperCase() ?? null;
    if (!countryCode) return null;

    if (ctx.geo.city) {
      const matches = await getLocationProvider().searchPlaces(ctx.geo.city, {
        countryCode,
        limit: 1,
      });
      if (matches[0]) {
        return { ...toPublicSuggestion(matches[0]), source: "ip_suggestion" as const };
      }
    }

    return {
      locationId: null,
      publicId: null,
      label: countryName(countryCode),
      cityName: null,
      regionCode: ctx.geo.regionCode,
      countryCode,
      placeType: "country" as const,
      source: "ip_suggestion" as const,
    };
  }),
});
