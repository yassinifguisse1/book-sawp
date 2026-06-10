import type {
  PlaceSuggestion,
  ResolvedPlace,
  ReverseGeocodeResult,
  SearchPlacesOptions,
} from "./types";

/**
 * Vendor-agnostic location lookup. Phase 1 ships a local MySQL-backed
 * implementation; later adapters (Typesense, Algolia, Mapbox, Google Places)
 * can satisfy the same contract without changing callers.
 */
export interface LocationProvider {
  searchPlaces(query: string, options?: SearchPlacesOptions): Promise<PlaceSuggestion[]>;
  resolvePlace(input: {
    locationId?: number;
    publicId?: string;
    sourceExternalId?: string;
  }): Promise<ResolvedPlace | null>;
  reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null>;
}
