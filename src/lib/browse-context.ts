import { countryName } from "@/lib/location-format";

export const BROWSE_CONTEXT_STORAGE_KEY = "bookswap.browseContext.v1";
export const BROWSE_CONTEXT_CHANGE_EVENT = "bookswap-browse-context-change";

export type LocationSource =
  | "manual_selection"
  | "profile_default"
  | "browser_geolocation"
  | "ip_suggestion";

export type BrowseContext = {
  locationId: number | null;
  label: string;
  countryCode: string;
  regionCode: string | null;
  cityName: string | null;
  /** null means "any distance". */
  radiusKm: number | null;
  includeDomesticShipping: boolean;
  includeInternationalShipping: boolean;
  locationSource: LocationSource;
};

export const RADIUS_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
  { label: "100 km", value: 100 },
  { label: "Any distance", value: null },
];

export const DEFAULT_BROWSE_CONTEXT: BrowseContext = {
  locationId: null,
  label: "United States",
  countryCode: "US",
  regionCode: null,
  cityName: null,
  radiusKm: 25,
  includeDomesticShipping: true,
  includeInternationalShipping: false,
  locationSource: "manual_selection",
};

export function normalizeCountryCode(value: unknown): string {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(code) ? code : "";
}

/** Best-effort ISO region from browser locale (e.g. fr-FR -> FR). */
export function guessCountryCodeFromBrowserLocale(): string {
  if (typeof navigator === "undefined") return "";

  const locales = [navigator.language, ...(navigator.languages ?? [])];
  for (const locale of locales) {
    const parts = locale.split(/[-_]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const region = parts.at(-1)?.toUpperCase() ?? "";
    if (/^[A-Z]{2}$/.test(region)) {
      return region;
    }
  }

  return "";
}

export function resolveFallbackBrowseContext(): BrowseContext {
  const localeCountry = guessCountryCodeFromBrowserLocale();
  if (localeCountry) {
    return {
      ...DEFAULT_BROWSE_CONTEXT,
      countryCode: localeCountry,
      label: countryName(localeCountry),
    };
  }

  return DEFAULT_BROWSE_CONTEXT;
}

export function parseBrowseContext(value: string | null): BrowseContext | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<BrowseContext>;
    if (!parsed || typeof parsed !== "object") return null;
    const countryCode = normalizeCountryCode(parsed.countryCode);
    if (!countryCode) return null;
    return {
      locationId:
        typeof parsed.locationId === "number" && parsed.locationId > 0
          ? parsed.locationId
          : null,
      label: typeof parsed.label === "string" && parsed.label ? parsed.label : countryName(countryCode),
      countryCode,
      regionCode: typeof parsed.regionCode === "string" ? parsed.regionCode : null,
      cityName: typeof parsed.cityName === "string" ? parsed.cityName : null,
      radiusKm:
        parsed.radiusKm === null
          ? null
          : typeof parsed.radiusKm === "number" && parsed.radiusKm > 0
            ? parsed.radiusKm
            : 25,
      includeDomesticShipping: parsed.includeDomesticShipping !== false,
      includeInternationalShipping: parsed.includeInternationalShipping === true,
      locationSource:
        parsed.locationSource === "profile_default" ||
        parsed.locationSource === "browser_geolocation" ||
        parsed.locationSource === "ip_suggestion"
          ? parsed.locationSource
          : "manual_selection",
    };
  } catch {
    return null;
  }
}

export function readBrowseContext(): BrowseContext | null {
  if (typeof window === "undefined") return null;
  try {
    return parseBrowseContext(window.localStorage.getItem(BROWSE_CONTEXT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveBrowseContext(context: BrowseContext) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BROWSE_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    window.dispatchEvent(new Event(BROWSE_CONTEXT_CHANGE_EVENT));
  } catch {
    // Browsing should continue normally if localStorage is unavailable.
  }
}
