import { describe, expect, it } from "vitest";

import {
  asciiPlaceName,
  encodeGeohash,
  geohashNeighbors,
  geohashPrecisionForRadiusKm,
  haversineKm,
  normalizePlaceName,
} from "@/lib/geo";

describe("name normalization", () => {
  it("lowercases, strips diacritics, and collapses whitespace", () => {
    expect(normalizePlaceName("  Montréal  City ")).toBe("montreal city");
    expect(normalizePlaceName("São Paulo")).toBe("sao paulo");
  });

  it("produces ASCII-only place names", () => {
    expect(asciiPlaceName("Köln")).toBe("Koln");
    expect(asciiPlaceName("北京")).toBe("");
  });
});

describe("geohash encoding", () => {
  it("encodes a known point to a stable geohash prefix", () => {
    // Portland, OR.
    expect(encodeGeohash(45.5152, -122.6784, 6)).toBe("c20fbm");
  });

  it("rejects invalid coordinates and precision", () => {
    expect(() => encodeGeohash(Number.NaN, 0, 6)).toThrow(TypeError);
    expect(() => encodeGeohash(0, Number.POSITIVE_INFINITY, 6)).toThrow(TypeError);
    expect(() => encodeGeohash(91, 0, 6)).toThrow(RangeError);
    expect(() => encodeGeohash(0, -181, 6)).toThrow(RangeError);
    expect(() => encodeGeohash(0, 0, 0)).toThrow(RangeError);
    expect(() => encodeGeohash(0, 0, 1.5)).toThrow(TypeError);
    expect(() => encodeGeohash(0, 0, 13)).toThrow(RangeError);
  });

  it("is deterministic for repeated calls (idempotent import key)", () => {
    const first = encodeGeohash(48.8566, 2.3522, 7);
    const second = encodeGeohash(48.8566, 2.3522, 7);
    expect(first).toBe(second);
  });

  it("returns the cell plus eight neighbours", () => {
    const neighbours = geohashNeighbors(encodeGeohash(45.5152, -122.6784, 5));
    expect(neighbours).toHaveLength(9);
    expect(new Set(neighbours).size).toBe(9);
  });

  it("widens the prefix as the radius grows", () => {
    expect(geohashPrecisionForRadiusKm(3)).toBeGreaterThan(geohashPrecisionForRadiusKm(50));
  });
});

describe("haversineKm", () => {
  it("returns zero for identical points", () => {
    expect(haversineKm(45.5, -122.6, 45.5, -122.6)).toBe(0);
  });

  it("approximates the Portland to Seattle distance", () => {
    const km = haversineKm(45.5152, -122.6784, 47.6062, -122.3321);
    expect(km).toBeGreaterThan(220);
    expect(km).toBeLessThan(250);
  });

  it("rejects out-of-range coordinates", () => {
    expect(() => haversineKm(91, 0, 0, 0)).toThrow(RangeError);
    expect(() => haversineKm(0, -181, 0, 0)).toThrow(RangeError);
    expect(() => haversineKm(0, 0, Number.NaN, 0)).toThrow(RangeError);
  });
});

describe("import-derived fields are deterministic", () => {
  it("normalization and geohash are stable for the same source row (idempotent upsert)", () => {
    const row = { city: "Saint-Étienne", lat: 45.4397, lng: 4.3872 };
    const a = {
      normalized: normalizePlaceName(row.city),
      ascii: asciiPlaceName(row.city),
      geohash: encodeGeohash(row.lat, row.lng, 7),
    };
    const b = {
      normalized: normalizePlaceName(row.city),
      ascii: asciiPlaceName(row.city),
      geohash: encodeGeohash(row.lat, row.lng, 7),
    };
    expect(a).toEqual(b);
  });
});
