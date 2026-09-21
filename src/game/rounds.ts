import { LOCATIONS } from '../data/locations';
import type { Filter, Location } from '../types';

export const ROUNDS_PER_GAME = 10;

export function poolFor(filter: Filter): Location[] {
  switch (filter.kind) {
    case 'world':
      return LOCATIONS;
    case 'continent':
      return LOCATIONS.filter((l) => l.continent === filter.continent);
    case 'country':
      return LOCATIONS.filter((l) => l.country === filter.country);
  }
}

export function describeFilter(filter: Filter): string {
  switch (filter.kind) {
    case 'world':
      return 'World';
    case 'continent':
      return filter.continent;
    case 'country':
      return filter.country;
  }
}

/**
 * Pick the round locations. Sampling without replacement keeps a game from
 * repeating a location; pools smaller than the round count fall back to
 * allowing repeats so a one-country game is still playable.
 */
export function pickRounds(pool: Location[], count = ROUNDS_PER_GAME): Location[] {
  if (pool.length === 0) return [];

  if (pool.length >= count) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  return Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]);
}
