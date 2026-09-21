import type { LatLng, Location } from '../types';

export const KEY_STORAGE = 'gg-clone:gmaps-key';

export function loadKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function saveKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* private mode — the key just won't persist between sessions */
  }
}

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

let loader: Promise<void> | null = null;
let authFailed = false;

/** True once Google has told us the key was rejected. */
export const keyWasRejected = () => authFailed;

/**
 * Load the Maps JS API once per page. Google gives no promise-based error for a
 * bad key — it calls the global `gm_authFailure` instead — so we latch that and
 * let callers surface it.
 */
export function loadMapsApi(key: string): Promise<void> {
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    if (window.google?.maps?.StreetViewService) return resolve();

    window.gm_authFailure = () => {
      authFailed = true;
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=streetView`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not reach the Google Maps API.'));
    document.head.appendChild(script);
  });

  return loader;
}

/**
 * Snap a curated coordinate to the nearest real panorama. Curated points sit on
 * city centres, which are not always exactly on a Street View road, so we widen
 * the search before giving up.
 */
export async function findPanorama(
  location: Location,
  radii: number[] = [200, 1000, 5000, 20000],
): Promise<{ panoId: string; position: LatLng } | null> {
  const service = new google.maps.StreetViewService();

  for (const radius of radii) {
    try {
      const { data } = await service.getPanorama({
        location: { lat: location.lat, lng: location.lng },
        radius,
        source: google.maps.StreetViewSource.OUTDOOR,
        preference: google.maps.StreetViewPreference.NEAREST,
      });

      const pos = data.location?.latLng;
      if (data.location?.pano && pos) {
        return {
          panoId: data.location.pano,
          position: { lat: pos.lat(), lng: pos.lng() },
        };
      }
    } catch {
      // ZERO_RESULTS rejects the promise; widen the radius and try again.
    }
  }

  return null;
}
