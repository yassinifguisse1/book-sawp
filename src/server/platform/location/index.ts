import { LocalLocationProvider } from "./local-location-provider";
import type { LocationProvider } from "./location-provider";

export type { LocationProvider } from "./location-provider";
export type {
  PlaceSuggestion,
  ResolvedPlace,
  ReverseGeocodeResult,
  SearchPlacesOptions,
  PlaceType,
} from "./types";

let provider: LocationProvider | undefined;

/**
 * Returns the active location provider. Phase 1 always returns the local
 * MySQL-backed provider; swapping in a Mapbox/Google/Typesense adapter later
 * only requires changing this factory.
 */
export function getLocationProvider(): LocationProvider {
  provider ??= new LocalLocationProvider();
  return provider;
}
