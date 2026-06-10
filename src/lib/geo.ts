const GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const MAX_GEOHASH_PRECISION = 12;

const EARTH_RADIUS_KM = 6371;

export function normalizePlaceName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function asciiPlaceName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function encodeGeohash(latitude: number, longitude: number, precision = 9): string {
  if (!Number.isFinite(latitude)) {
    throw new TypeError(`latitude must be a finite number, received ${latitude}`);
  }
  if (latitude < -90 || latitude > 90) {
    throw new RangeError(`latitude must be between -90 and 90, received ${latitude}`);
  }
  if (!Number.isFinite(longitude)) {
    throw new TypeError(`longitude must be a finite number, received ${longitude}`);
  }
  if (longitude < -180 || longitude > 180) {
    throw new RangeError(`longitude must be between -180 and 180, received ${longitude}`);
  }
  if (!Number.isInteger(precision)) {
    throw new TypeError(`precision must be a positive integer, received ${precision}`);
  }
  if (precision < 1 || precision > MAX_GEOHASH_PRECISION) {
    throw new RangeError(
      `precision must be between 1 and ${MAX_GEOHASH_PRECISION}, received ${precision}`,
    );
  }

  let isEven = true;
  let bit = 0;
  let charIndex = 0;
  let geohash = "";
  const lat: [number, number] = [-90, 90];
  const lng: [number, number] = [-180, 180];

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lng[0] + lng[1]) / 2;
      if (longitude >= mid) {
        charIndex = (charIndex << 1) + 1;
        lng[0] = mid;
      } else {
        charIndex = charIndex << 1;
        lng[1] = mid;
      }
    } else {
      const mid = (lat[0] + lat[1]) / 2;
      if (latitude >= mid) {
        charIndex = (charIndex << 1) + 1;
        lat[0] = mid;
      } else {
        charIndex = charIndex << 1;
        lat[1] = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit += 1;
    } else {
      geohash += GEOHASH_BASE32[charIndex];
      bit = 0;
      charIndex = 0;
    }
  }

  return geohash;
}

type GeohashBounds = { latMin: number; latMax: number; lngMin: number; lngMax: number };

function decodeGeohashBounds(geohash: string): GeohashBounds {
  let isEven = true;
  const lat: [number, number] = [-90, 90];
  const lng: [number, number] = [-180, 180];

  for (const char of geohash) {
    const charIndex = GEOHASH_BASE32.indexOf(char);
    if (charIndex === -1) continue;
    for (let mask = 16; mask >= 1; mask >>= 1) {
      if (isEven) {
        const mid = (lng[0] + lng[1]) / 2;
        if (charIndex & mask) lng[0] = mid;
        else lng[1] = mid;
      } else {
        const mid = (lat[0] + lat[1]) / 2;
        if (charIndex & mask) lat[0] = mid;
        else lat[1] = mid;
      }
      isEven = !isEven;
    }
  }

  return { latMin: lat[0], latMax: lat[1], lngMin: lng[0], lngMax: lng[1] };
}

/**
 * Returns the supplied geohash plus its eight adjacent cells. Used to build a
 * candidate set that fully contains a search disk before exact distance is
 * calculated, so we never scan every listing.
 */
export function geohashNeighbors(geohash: string): string[] {
  if (!geohash) return [];
  const precision = geohash.length;
  const { latMin, latMax, lngMin, lngMax } = decodeGeohashBounds(geohash);
  const latStep = latMax - latMin;
  const lngStep = lngMax - lngMin;
  const centerLat = (latMin + latMax) / 2;
  const centerLng = (lngMin + lngMax) / 2;

  const cells = new Set<string>([geohash]);
  for (const dLat of [-1, 0, 1]) {
    for (const dLng of [-1, 0, 1]) {
      if (dLat === 0 && dLng === 0) continue;
      const lat = Math.max(-89.9999, Math.min(89.9999, centerLat + dLat * latStep));
      let lng = centerLng + dLng * lngStep;
      if (lng < -180) lng += 360;
      if (lng > 180) lng -= 360;
      cells.add(encodeGeohash(lat, lng, precision));
    }
  }
  return [...cells];
}

/**
 * Geohash prefix length whose cell width is at least the search radius, so the
 * 3x3 neighbour block is guaranteed to contain the full search disk.
 */
export function geohashPrecisionForRadiusKm(radiusKm: number): number {
  if (radiusKm <= 4) return 5;
  if (radiusKm <= 39) return 4;
  if (radiusKm <= 156) return 3;
  return 2;
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  for (const latitude of [lat1, lat2]) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new RangeError(`latitude must be between -90 and 90, received ${latitude}`);
    }
  }
  for (const longitude of [lng1, lng2]) {
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new RangeError(`longitude must be between -180 and 180, received ${longitude}`);
    }
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function kmToMiles(km: number) {
  return km * 0.621371;
}

/**
 * Approximate distance label that never exposes a precise position. Distances
 * are rounded to coarse buckets before display.
 */
export function approximateDistanceLabel(
  km: number,
  unit: "km" | "mi" = "km",
): string {
  const value = unit === "mi" ? kmToMiles(km) : km;
  const suffix = unit === "mi" ? "mi" : "km";
  if (value < 1) return `under 1 ${suffix}`;
  if (value < 10) return `${Math.round(value)} ${suffix}`;
  if (value < 50) return `${Math.round(value / 5) * 5} ${suffix}`;
  return `${Math.round(value / 10) * 10} ${suffix}`;
}
