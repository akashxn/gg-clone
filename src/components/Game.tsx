import { useEffect, useMemo, useRef, useState } from 'react';
import GuessMap from './GuessMap';
import Panorama, { type PannellumViewer } from './Panorama';
import { angleDelta, bearing, formatDistance, haversineKm, mapSizeKm, scoreForGuess } from '../game/geo';
import { ROUNDS_PER_GAME, describeFilter, pickRounds, poolFor } from '../game/rounds';
import { fetchNeighbors, type Neighbor } from '../game/panoramax';
import type { Filter, LatLng, RoundResult } from '../types';

interface Props {
  filter: Filter;
  onFinish: (results: RoundResult[]) => void;
  onQuit: () => void;
}

/** Where the player currently stands — the drop point, or a step along it. */
interface Standpoint extends LatLng {
  url: string;
  azimuth: number | null;
}

/** How far off your facing a panorama may be and still count as "forward". */
const FORWARD_ARC = 75;

export default function Game({ filter, onFinish, onQuit }: Props) {
  const pool = useMemo(() => poolFor(filter), [filter]);
  const size = useMemo(() => mapSizeKm(pool), [pool]);
  const queue = useMemo(() => pickRounds(pool), [pool]);

  const [roundIndex, setRoundIndex] = useState(0);
  const location = queue[roundIndex];

  const [here, setHere] = useState<Standpoint | null>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [imageReady, setImageReady] = useState(false);

  const [guess, setGuess] = useState<LatLng | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const viewerRef = useRef<PannellumViewer | null>(null);
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);

  // --- start of a round: stand on the drop point ------------------------
  useEffect(() => {
    if (!location) return;
    setHere({ url: location.url, lat: location.lat, lng: location.lng, azimuth: null });
    setVisited([location.url]);
    setNeighbors([]);
    setGuess(null);
    setRevealed(false);
    setExpanded(false);
    setImageReady(false);
  }, [location]);

  // --- what can we walk to from here? -----------------------------------
  useEffect(() => {
    if (!here || revealed) return;
    const ac = new AbortController();

    fetchNeighbors({ lat: here.lat, lng: here.lng }, 170, ac.signal).then((found) => {
      if (ac.signal.aborted) return;
      setNeighbors(found);

      // The response usually contains the picture we are standing on, which
      // is the only place its camera heading is available to us.
      if (here.azimuth === null) {
        const self = found.find((n) => n.url === here.url);
        if (self?.azimuth !== null && self?.azimuth !== undefined) {
          setHere((cur) => (cur && cur.url === here.url ? { ...cur, azimuth: self.azimuth } : cur));
        }
      }
    });

    return () => ac.abort();
  }, [here, revealed]);

  /**
   * Step to another panorama. Prefers one roughly ahead of where the player is
   * looking; falls back to the nearest unvisited one, so movement still works
   * when an instance publishes no camera heading.
   */
  const move = () => {
    if (!here) return;

    const candidates = neighbors
      .filter((n) => !visited.includes(n.url))
      .map((n) => ({
        n,
        distanceKm: haversineKm(here, n),
        bearingTo: bearing(here, n),
      }))
      .filter((c) => c.distanceKm > 0)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (candidates.length === 0) return;

    let pick = candidates[0];
    if (here.azimuth !== null && viewerRef.current) {
      const facing = (here.azimuth + viewerRef.current.getYaw() + 360) % 360;
      const ahead = candidates.find((c) => Math.abs(angleDelta(facing, c.bearingTo)) <= FORWARD_ARC);
      if (ahead) pick = ahead;
    }

    setImageReady(false);
    setVisited((v) => [...v, pick.n.url]);
    setHere({ url: pick.n.url, lat: pick.n.lat, lng: pick.n.lng, azimuth: pick.n.azimuth });
  };

  const returnToStart = () => {
    if (!location) return;
    setImageReady(false);
    setHere({ url: location.url, lat: location.lat, lng: location.lng, azimuth: null });
  };

  // --- guessing ----------------------------------------------------------
  const submitGuess = () => {
    if (!guess || !location || revealed) return;
    const distanceKm = haversineKm(guess, { lat: location.lat, lng: location.lng });
    setResults((rs) => [...rs, { location, guess, distanceKm, score: scoreForGuess(distanceKm, size) }]);
    setExpanded(true);
    setRevealed(true);
  };

  const skipRound = () => {
    if (!location || revealed) return;
    setResults((rs) => [...rs, { location, guess: null, distanceKm: null, score: 0 }]);
    setExpanded(true);
    setRevealed(true);
  };

  const nextRound = () => {
    if (roundIndex + 1 >= ROUNDS_PER_GAME) {
      onFinish(results);
      return;
    }
    setRoundIndex((i) => i + 1);
  };

  if (!location) {
    return (
      <div className="screen screen--center">
        <div className="panel panel--narrow">
          <div className="panel__icon" aria-hidden="true">⚠️</div>
          <h2>No panoramas in this map</h2>
          <p className="muted">Pick a wider region and try again.</p>
          <button className="btn btn--primary" onClick={onQuit}>Back to menu</button>
        </div>
      </div>
    );
  }

  const last = results[results.length - 1];
  const isFinalRound = roundIndex + 1 >= ROUNDS_PER_GAME;
  const canMove = !revealed && neighbors.some((n) => !visited.includes(n.url));
  const stepsTaken = visited.length - 1;

  return (
    <div className="game">
      <header className="hud">
        <button className="hud__quit" onClick={onQuit} title="Quit to menu">✕</button>
        <div className="hud__stat">
          <span className="hud__label">Map</span>
          <span className="hud__value">{describeFilter(filter)}</span>
        </div>
        <div className="hud__stat">
          <span className="hud__label">Round</span>
          <span className="hud__value">{roundIndex + 1} / {ROUNDS_PER_GAME}</span>
        </div>
        <div className="hud__stat">
          <span className="hud__label">Score</span>
          <span className="hud__value">{totalScore.toLocaleString()}</span>
        </div>
        {!revealed && (
          <div className="hud__tools">
            <button className="hud__btn" onClick={() => setResetSignal((n) => n + 1)}>
              Reset view
            </button>
            <button className="hud__btn" onClick={move} disabled={!canMove} title="Walk to a nearby panorama">
              Move ↑
            </button>
            <button className="hud__btn" onClick={returnToStart} disabled={stepsTaken === 0}>
              Back to drop
            </button>
          </div>
        )}
      </header>

      <div className="stage">
        {here && (
          <Panorama
            key={here.url}
            url={here.url}
            resetSignal={resetSignal}
            onReady={(v) => { viewerRef.current = v; }}
            onLoad={() => setImageReady(true)}
          />
        )}
        {!imageReady && (
          <div className="loading loading--overlay">
            <div className="spinner" aria-hidden="true" />
            <p>Loading panorama…</p>
          </div>
        )}
      </div>

      <div
        className={`mapdock ${expanded ? 'mapdock--expanded' : ''} ${revealed ? 'mapdock--revealed' : ''}`}
        onMouseEnter={() => !revealed && setExpanded(true)}
        onMouseLeave={() => !revealed && setExpanded(false)}
      >
        <div className="mapdock__map">
          <GuessMap
            onPick={revealed ? null : setGuess}
            guess={guess}
            actual={revealed && last ? last.location : null}
          />
        </div>

        {!revealed && (
          <div className="mapdock__actions">
            <button className="btn btn--primary btn--block" disabled={!guess} onClick={submitGuess}>
              {guess ? 'Make guess' : 'Click the map to place your pin'}
            </button>
            <button className="btn btn--ghost btn--block" onClick={skipRound}>
              Skip round
            </button>
          </div>
        )}
      </div>

      {revealed && last && (
        <div className="reveal">
          <div className="reveal__body">
            <p className="reveal__place">{last.location.name}, {last.location.country}</p>
            <p className="reveal__distance">
              {last.distanceKm === null
                ? 'Round skipped'
                : `You were ${formatDistance(last.distanceKm)} away`}
            </p>
            <p className="reveal__score">
              <strong>{last.score.toLocaleString()}</strong> / 5,000
            </p>
            <div className="reveal__bar">
              <div className="reveal__barfill" style={{ width: `${(last.score / 5000) * 100}%` }} />
            </div>
          </div>
          <button className="btn btn--primary btn--block" onClick={nextRound}>
            {isFinalRound ? 'See results' : 'Next round'}
          </button>
        </div>
      )}
    </div>
  );
}
