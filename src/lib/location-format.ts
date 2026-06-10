export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  MA: "Morocco",
  FR: "France",
  ES: "Spain",
  DE: "Germany",
  IT: "Italy",
  NL: "Netherlands",
  BE: "Belgium",
  PT: "Portugal",
  IE: "Ireland",
  AU: "Australia",
};

export function countryName(countryCode: string | null | undefined) {
  const code = (countryCode ?? "").trim().toUpperCase();
  return COUNTRY_NAMES[code] ?? code;
}

type LocationLabelParts = {
  cityName?: string | null;
  regionCode?: string | null;
  countryCode?: string | null;
};

/** Public-facing label such as "Portland, OR, US". Never includes coordinates. */
export function formatLocationLabel(parts: LocationLabelParts): string {
  return [parts.cityName, parts.regionCode, parts.countryCode]
    .map((part) => part?.toString().trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

/** Short label used inside the header selector, e.g. "Portland, US". */
export function formatBrowseLabel(parts: LocationLabelParts): string {
  return [parts.cityName, parts.countryCode]
    .map((part) => part?.toString().trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}
