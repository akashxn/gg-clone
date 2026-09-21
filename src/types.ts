export type Continent =
  | 'Africa'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'Oceania'
  | 'South America';

export interface Location {
  id: number;
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

/** What the player picked on the setup screen. */
export type Filter =
  | { kind: 'world' }
  | { kind: 'continent'; continent: Continent }
  | { kind: 'country'; country: string };

/** A finished round: where it was, where they clicked, what it cost them. */
export interface RoundResult {
  location: Location;
  /** null when the round was skipped or timed out without a guess. */
  guess: LatLng | null;
  distanceKm: number | null;
  score: number;
}

export type Phase = 'home' | 'setup' | 'playing' | 'summary' | 'multiplayer';
