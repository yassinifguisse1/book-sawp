import { describe, expect, it } from "vitest";

import { normalizeShippingScopeForForm } from "@/lib/listing-delivery";

describe("normalizeShippingScopeForForm", () => {
  it("maps pickup_only to domestic_only for the form dropdown", () => {
    expect(normalizeShippingScopeForForm("pickup_only")).toBe("domestic_only");
  });

  it("passes through manual-shipping scopes unchanged", () => {
    expect(normalizeShippingScopeForForm("domestic_only")).toBe("domestic_only");
    expect(normalizeShippingScopeForForm("selected_countries")).toBe("selected_countries");
    expect(normalizeShippingScopeForForm("worldwide")).toBe("worldwide");
  });
});
