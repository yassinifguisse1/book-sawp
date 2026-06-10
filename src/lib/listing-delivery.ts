export type ListingShippingScope =
  | "pickup_only"
  | "domestic_only"
  | "selected_countries"
  | "worldwide";

export type ListingFormShippingScope = Exclude<ListingShippingScope, "pickup_only">;

/**
 * Maps persisted `books.shippingScope` to the ListingForm shipping dropdown.
 * `pickup_only` is stored when manual shipping is off; the form only exposes
 * domestic/selected/worldwide while "Offer shipping" is checked. When loading
 * a pickup-only listing, seed the hidden field with `domestic_only` so enabling
 * shipping shows a sensible default instead of an invalid select value.
 */
export function normalizeShippingScopeForForm(
  shippingScope: ListingShippingScope,
): ListingFormShippingScope {
  return shippingScope === "pickup_only" ? "domestic_only" : shippingScope;
}
