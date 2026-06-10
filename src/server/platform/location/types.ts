export type PlaceType = "country" | "region" | "city";

export type PlaceSuggestion = {
  locationId: number;
  publicId: string;
  label: string;
  cityName: string | null;
  regionCode: string | null;
  countryCode: string;
  placeType: PlaceType;
  population: number;
};

export type ResolvedPlace = {
  locationId: number;
  publicId: string;
  placeType: PlaceType;
  countryCode: string;
  regionCode: string | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
  geohash: string | null;
  label: string;
};

export type ReverseGeocodeResult = ResolvedPlace & {
  distanceKm: number;
};

export type SearchPlacesOptions = {
  countryCode?: string;
  limit?: number;
};
