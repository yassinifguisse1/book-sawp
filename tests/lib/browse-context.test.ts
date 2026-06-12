import { afterEach, describe, expect, it, vi } from "vitest";

import {
  guessCountryCodeFromBrowserLocale,
  normalizeCountryCode,
  parseBrowseContext,
  resolveFallbackBrowseContext,
} from "@/lib/browse-context";

describe("browse context country handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects invalid country codes instead of defaulting to US", () => {
    expect(normalizeCountryCode("us")).toBe("US");
    expect(normalizeCountryCode("USA")).toBe("");
    expect(normalizeCountryCode("")).toBe("");
    expect(normalizeCountryCode(null)).toBe("");
  });

  it("treats stored browse context with invalid country as missing", () => {
    const invalid = JSON.stringify({
      countryCode: "not-a-country",
      label: "Somewhere",
      locationSource: "manual_selection",
    });

    expect(parseBrowseContext(invalid)).toBeNull();
  });

  it("parses stored browse context with a valid country", () => {
    const valid = JSON.stringify({
      countryCode: "MA",
      label: "Morocco",
      locationSource: "manual_selection",
    });

    expect(parseBrowseContext(valid)?.countryCode).toBe("MA");
  });

  it("derives a country from browser locale before the global default", () => {
    vi.stubGlobal("navigator", {
      language: "fr-FR",
      languages: ["fr-FR", "en"],
    });

    expect(guessCountryCodeFromBrowserLocale()).toBe("FR");
    expect(resolveFallbackBrowseContext().countryCode).toBe("FR");
  });

  it("falls back to the global default only when locale has no region", () => {
    vi.stubGlobal("navigator", {
      language: "en",
      languages: ["en"],
    });

    expect(guessCountryCodeFromBrowserLocale()).toBe("");
    expect(resolveFallbackBrowseContext().countryCode).toBe("US");
  });
});
