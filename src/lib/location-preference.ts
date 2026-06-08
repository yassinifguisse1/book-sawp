export const LOCATION_PREFERENCE_STORAGE_KEY = "bookswap.locationPreference.v1";
export const LOCATION_PREFERENCE_CHANGE_EVENT = "bookswap-location-preference-change";

const DISMISSAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type LocationPreference = {
  country: string;
  dismissedAt?: string;
  savedAt?: string;
};

export const countryOptions = [
  { code: "US", name: "United States" },
  { code: "MA", name: "Morocco" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" },
  { code: "IE", name: "Ireland" },
  { code: "AU", name: "Australia" },
];

export function normalizeCountryCode(country: string | null | undefined) {
  const code = country?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(code) ? code : "US";
}

export function getCountryName(country: string | null | undefined) {
  const code = normalizeCountryCode(country);
  return countryOptions.find((option) => option.code === code)?.name ?? code;
}

export function parseLocationPreference(value: string | null): LocationPreference | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<LocationPreference>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.country !== "string") {
      return null;
    }

    return {
      country: normalizeCountryCode(parsed.country),
      dismissedAt: typeof parsed.dismissedAt === "string" ? parsed.dismissedAt : undefined,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function readLocationPreference() {
  if (typeof window === "undefined") return null;
  try {
    return parseLocationPreference(window.localStorage.getItem(LOCATION_PREFERENCE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function getPreferredCountry(fallback = "US") {
  return readLocationPreference()?.country ?? normalizeCountryCode(fallback);
}

export function shouldShowLocationPrompt(preference: LocationPreference | null) {
  if (!preference) return true;
  if (preference.savedAt) return false;
  if (!preference.dismissedAt) return true;

  const dismissedAt = new Date(preference.dismissedAt).getTime();
  if (!Number.isFinite(dismissedAt)) return true;

  return Date.now() - dismissedAt > DISMISSAL_TTL_MS;
}

export function saveLocationPreference(country: string) {
  writeLocationPreference({
    country: normalizeCountryCode(country),
    savedAt: new Date().toISOString(),
  });
}

export function dismissLocationPreference(country = "US") {
  writeLocationPreference({
    country: normalizeCountryCode(country),
    dismissedAt: new Date().toISOString(),
  });
}

function writeLocationPreference(preference: LocationPreference) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      LOCATION_PREFERENCE_STORAGE_KEY,
      JSON.stringify(preference),
    );
    window.dispatchEvent(new Event(LOCATION_PREFERENCE_CHANGE_EVENT));
  } catch {
    // Browsing should continue normally if localStorage is unavailable.
  }
}
