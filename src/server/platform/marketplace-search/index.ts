import { MysqlMarketplaceSearchProvider } from "./mysql-marketplace-search-provider";
import type { MarketplaceSearchProvider } from "./marketplace-search-provider";

export type {
  MarketplaceSearchProvider,
  DiscoveryRequest,
  DiscoveryResult,
  DiscoveryGroupResult,
  DiscoveryListing,
  DiscoveryFilters,
  DiscoverySort,
  DeliveryMode,
} from "./types";

let provider: MarketplaceSearchProvider | undefined;

/**
 * Returns the active marketplace search provider. Phase 1 ships the MySQL
 * adapter; an Algolia/Typesense/OpenSearch adapter can replace it here without
 * changing the discovery router.
 */
export function getMarketplaceSearchProvider(): MarketplaceSearchProvider {
  provider ??= new MysqlMarketplaceSearchProvider();
  return provider;
}
