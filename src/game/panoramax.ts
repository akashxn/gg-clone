import type { LatLng } from '../types';

/**
 * Panoramax search API — open, keyless, no account. We only ever ask for
 * equirectangular pictures, so anything we step onto is a full panorama.
 * https://panoramax.xyz
 */
const API = 'https://api.panoramax.xyz/api/search';

export interface Neighbor extends LatLng {
  url: string;
  /**
   * Camera heading in degrees clockwise from north, when the instance
   * recorded one. Lets us turn the viewer's image-relative yaw into a real
   * compass direction so "move" walks the way the player is looking.
   */
  azimuth: number | null;
}

const METRES_PER_DEG_LAT = 111_320;

/**
 * Panoramas within `radiusM` of a point, for walking along the street.
 * Network failures resolve to an empty list — movement is a bonus, and a
 * round stays playable without it.
 */
export async function fetchNeighbors(
  at: LatLng,
  radiusM = 170,
  signal?: AbortSignal,
): Promise<Neighbor[]> {
  const dLat = radiusM / METRES_PER_DEG_LAT;
  const dLng = radiusM / (METRES_PER_DEG_LAT * Math.cos((at.lat * Math.PI) / 180) || 1);

  const params = new URLSearchParams({
    bbox: [at.lng - dLng, at.lat - dLat, at.lng + dLng, at.lat + dLat].join(','),
    filter: 'field_of_view=360',
    limit: '80',
  });

  try {
    const res = await fetch(`${API}?${params}`, { signal });
    if (!res.ok) return [];

    const body = (await res.json()) as {
      features?: {
        geometry?: { coordinates?: [number, number] };
        assets?: { sd?: { href?: string } };
        properties?: { 'view:azimuth'?: number };
      }[];
    };

    const out: Neighbor[] = [];
    for (const f of body.features ?? []) {
      const coords = f.geometry?.coordinates;
      const url = f.assets?.sd?.href;
      if (!coords || !url) continue;
      const az = f.properties?.['view:azimuth'];
      out.push({
        lng: coords[0],
        lat: coords[1],
        url,
        azimuth: typeof az === 'number' ? az : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}
