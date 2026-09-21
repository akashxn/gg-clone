import type { LatLng, Location } from '../types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const MAX_ROUND_SCORE = 5000;

/**
 * GeoGuessr's published curve: 5000 * e^(-10 * distance / mapSize).
 * `mapSize` is the diagonal of the playable area, so a guess that is "half a
 * map away" scores the same whether the map is the world or one country.
 */
export function scoreForGuess(distanceKm: number, mapSizeKm: number): number {
  const size = Math.max(mapSizeKm, 1);
  return Math.round(MAX_ROUND_SCORE * Math.exp((-10 * distanceKm) / size));
}

/** Diagonal of the bounding box containing every location in the pool. */
export function mapSizeKm(pool: Location[]): number {
  if (pool.length < 2) return 14916.862; // fall back to the world value

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  for (const loc of pool) {
    minLat = Math.min(minLat, loc.lat);
    maxLat = Math.max(maxLat, loc.lat);
    minLng = Math.min(minLng, loc.lng);
    maxLng = Math.max(maxLng, loc.lng);
  }

  const diagonal = haversineKm({ lat: minLat, lng: minLng }, { lat: maxLat, lng: maxLng });

  // Very tight pools (a single city, say) would make scoring absurdly harsh.
  return Math.max(diagonal, 50);
}

/** Human-readable distance — metres under 1km, then sensible precision. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}
