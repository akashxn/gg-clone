import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { LatLng, Location } from '../types';

interface Props {
  /** Set while guessing; null once the round is revealed. */
  onPick: ((p: LatLng) => void) | null;
  guess: LatLng | null;
  /** Provided only after the guess is locked in — draws the reveal. */
  actual: Location | null;
}

// Bundlers break Leaflet's default icon URLs, so we draw our own pins in CSS.
const pin = (kind: 'guess' | 'actual') =>
  L.divIcon({
    className: '',
    html: `<div class="pin pin--${kind}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });

export default function GuessMap({ onPick, guess, actual }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const guessMarker = useRef<L.Marker | null>(null);
  const actualMarker = useRef<L.Marker | null>(null);
  const line = useRef<L.Polyline | null>(null);
  // Keeps the click handler current without tearing down the map each render.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;

    const map = L.map(hostRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      worldCopyJump: true,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      onPickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;

    return () => {
      map.stop();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render the player's pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!guess) {
      guessMarker.current?.remove();
      guessMarker.current = null;
      return;
    }

    const pos: L.LatLngExpression = [guess.lat, guess.lng];
    if (guessMarker.current) guessMarker.current.setLatLng(pos);
    else guessMarker.current = L.marker(pos, { icon: pin('guess') }).addTo(map);
  }, [guess]);

  // Reveal: drop the true pin, join the two, and frame them both.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    actualMarker.current?.remove();
    actualMarker.current = null;
    line.current?.remove();
    line.current = null;

    if (!actual) return;

    const truth: L.LatLngExpression = [actual.lat, actual.lng];
    actualMarker.current = L.marker(truth, { icon: pin('actual') })
      .addTo(map)
      .bindTooltip(`${actual.name}, ${actual.country}`, { permanent: false });

    if (guess) {
      const pts: L.LatLngExpression[] = [[guess.lat, guess.lng], truth];
      line.current = L.polyline(pts, {
        color: '#f5c451',
        weight: 2,
        dashArray: '6 6',
      }).addTo(map);
      map.fitBounds(L.latLngBounds(pts).pad(0.35), { animate: false });
    } else {
      map.setView(truth, 5, { animate: false });
    }
  }, [actual, guess]);

  // Leaflet mis-measures a container that was hidden or resized while mounted.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const observer = new ResizeObserver(() => {
      if (!mapRef.current) return;
      try {
        map.invalidateSize();
      } catch {
        /* container already torn down */
      }
    });
    if (hostRef.current) observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={hostRef} className="guessmap" />;
}
