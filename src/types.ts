export type Continent =
  | 'Africa'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'Oceania'
  | 'South America';

/** One playable drop point: an equirectangular panorama and where it was shot. */
export interface Location {
  id: number;
  /** Direct image URL on whichever Panoramax instance hosts it. */
  url: string;
  /** Nearest named place — used for the reveal, not shown during play. */
  name: string;
  country: string;
  continent: Continent;
  lat: number;
  lng: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type Filter =
  | { kind: 'world' }
  | { kind: 'continent'; continent: Continent }
  | { kind: 'country'; country: string };

export interface RoundResult {
  location: Location;
  /** null when the round was skipped. */
  guess: LatLng | null;
  distanceKm: number | null;
  score: number;
}

export type Phase = 'home' | 'setup' | 'playing' | 'summary' | 'multiplayer';
