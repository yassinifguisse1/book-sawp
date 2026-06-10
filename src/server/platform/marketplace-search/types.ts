import type { BrowseContext } from "@/server/domain/search-eligibility";
import type { PlaceSuggestion, SearchPlacesOptions } from "@/server/platform/location";

export type DiscoverySort =
  | "relevance"
  | "recent"
  | "price_asc"
  | "price_desc"
  | "distance";

export type DeliveryMode = "pickup" | "ship" | "both";

export type DiscoveryFilters = {
  search?: string;
  genre?: string;
  categorySlug?: string;
  transactionType?: "swap" | "giveaway" | "sale";
  condition?: "likenew" | "verygood" | "good" | "fair" | "poor";
  educationLevel?: string;
  schoolType?: "public_school" | "private_school" | "not_applicable";
  language?: string;
  deliveryMode?: DeliveryMode;
  localOnly?: boolean;
  sameCountryOnly?: boolean;
};

export type DiscoveryRequest = {
  browse: BrowseContext;
  filters: DiscoveryFilters;
  sort: DiscoverySort;
  perGroupLimit: number;
};

export type DiscoveryOwner = {
  publicId: string;
  name: string | null;
  avatar: string | null;
};

export type DiscoveryListing = {
  id: number;
  publicId: string;
  title: string;
  author: string;
  genre: string;
  condition: string;
  transactionType: string;
  status: string;
  currency: string;
  price: string | null;
  shippingCost: string;
  imageUrl: string | null;
  imageUrls: string[] | null;
  createdAt: Date;
  displayLocation: string;
  regionCode: string | null;
  countryCode: string;
  approximateDistanceKm: number | null;
  distanceLabel: string | null;
  pickupAvailable: boolean;
  shipsToYou: boolean;
  owner: DiscoveryOwner;
};

export type DiscoveryGroupResult = {
  items: DiscoveryListing[];
  total: number;
};

export type DiscoveryResult = {
  nearYou: DiscoveryGroupResult;
  inCountry: DiscoveryGroupResult;
  international: DiscoveryGroupResult;
  meta: {
    countryCode: string;
    countryName: string;
    radiusKm: number | null;
    distanceUnit: "km" | "mi";
    totalEligible: number;
    sparseNearby: boolean;
  };
};

export interface MarketplaceSearchProvider {
  searchListings(request: DiscoveryRequest): Promise<DiscoveryResult>;
  getNearbyListings(request: DiscoveryRequest): Promise<DiscoveryGroupResult>;
  getListingsShippableTo(
    countryCode: string,
    request: DiscoveryRequest,
  ): Promise<DiscoveryGroupResult>;
  getLocationSuggestions(
    query: string,
    options?: SearchPlacesOptions,
  ): Promise<PlaceSuggestion[]>;
}
