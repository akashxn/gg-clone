import { useEffect, useMemo, useRef, useState } from 'react';
import GuessMap from './GuessMap';
import Panorama from './Panorama';
import KeySetup from './KeySetup';
import { formatDistance, haversineKm, mapSizeKm, scoreForGuess } from '../game/geo';
import { ROUNDS_PER_GAME, describeFilter, pickRounds, poolFor } from '../game/rounds';
import { findPanorama, keyWasRejected, loadKey, loadMapsApi, saveKey } from '../game/streetview';
import type { Filter, LatLng, Location, RoundResult } from '../types';

interface Props {
  filter: Filter;
  onFinish: (results: RoundResult[]) => void;
  onQuit: () => void;
}

type Status = 'need-key' | 'booting' | 'finding' | 'ready' | 'revealed' | 'error';

export default function Game({ filter, onFinish, onQuit }: Props) {
  const pool = useMemo(() => poolFor(filter), [filter]);
  const size = useMemo(() => mapSizeKm(pool), [pool]);

  const [key, setKey] = useState(loadKey);
  const [status, setStatus] = useState<Status>(key ? 'booting' : 'need-key');
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);

  const [queue, setQueue] = useState<Location[]>(() => pickRounds(pool));
  const [roundIndex, setRoundIndex] = useState(0);
  const [location, setLocation] = useState<Location | null>(null);
  const [panoId, setPanoId] = useState<string | null>(null);

  const [guess, setGuess] = useState<LatLng | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  // Locations already tried, so a coverage gap never re-serves the same dud.
  const usedIds = useRef(new Set<number>());
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);

  // --- boot the Maps API -------------------------------------------------
  useEffect(() => {
    if (!key || status !== 'booting') return;
    let cancelled = false;

    loadMapsApi(key)
      .then(() => {
        // gm_authFailure fires slightly after load, so give it a beat.
        setTimeout(() => {
          if (cancelled) return;
          if (keyWasRejected()) {
            setRejected(true);
            setStatus('need-key');
          } else {
            setStatus('finding');
          }
        }, 400);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [key, status]);

  // --- resolve a panorama for the current round --------------------------
  // Keyed on `status` so every transition into 'finding' resolves exactly one
  // round; the terminal setStatus below stops it re-running.
  useEffect(() => {
    if (status !== 'finding') return;
    let cancelled = false;

    (async () => {
      setGuess(null);
      setPanoId(null);

      // Try the queued location first, then any unused fallback from the pool,
      // so a coverage gap costs a moment rather than the whole round.
      const queued = queue[roundIndex];
      const fallbacks = pool.filter((l) => !usedIds.current.has(l.id));
      const candidates = [queued, ...fallbacks].filter(Boolean) as Location[];

      for (const candidate of candidates.slice(0, 8)) {
        usedIds.current.add(candidate.id);
        const found = await findPanorama(candidate);
        if (cancelled) return;

        if (found) {
          setLocation(candidate);
          setPanoId(found.panoId);
          setStatus('ready');
          return;
        }
      }

      setError('No Street View coverage could be found for this map. Try a wider region.');
      setStatus('error');
    })();

    return () => {
      cancelled = true;
    };
  }, [status, roundIndex, pool, queue]);

  // --- actions -----------------------------------------------------------
  const submitGuess = () => {
    if (!guess || !location || status !== 'ready') return;
    const distanceKm = haversineKm(guess, { lat: location.lat, lng: location.lng });
    setResults((rs) => [...rs, { location, guess, distanceKm, score: scoreForGuess(distanceKm, size) }]);
    setExpanded(true);
    setStatus('revealed');
  };

  const skipRound = () => {
    if (!location) return;
    setResults((rs) => [...rs, { location, guess: null, distanceKm: null, score: 0 }]);
    setExpanded(true);
    setStatus('revealed');
  };

  const nextRound = () => {
    setExpanded(false);
    if (roundIndex + 1 >= ROUNDS_PER_GAME) {
      onFinish(results);
      return;
    }
    setRoundIndex((i) => i + 1);
    setStatus('finding');
  };

  // --- gates -------------------------------------------------------------
  if (status === 'need-key') {
    return (
      <KeySetup
        rejected={rejected}
        onBack={onQuit}
        onSaved={(k) => {
          saveKey(k);
          setKey(k);
          setRejected(false);
          setQueue(pickRounds(pool));
          usedIds.current.clear();
          // A rejected key already loaded the script; a reload picks up the new one.
          window.location.reload();
        }}
      />
    );
  }

  if (status === 'error') {
    return (
      <div className="screen screen--center">
        <div className="panel panel--narrow">
          <div className="panel__icon" aria-hidden="true">⚠️</div>
          <h2>Something went wrong</h2>
          <p className="muted">{error}</p>
          <button className="btn btn--primary" onClick={onQuit}>Back to menu</button>
        </div>
      </div>
    );
  }

  const last = results[results.length - 1];
  const revealed = status === 'revealed';
  const isFinalRound = roundIndex + 1 >= ROUNDS_PER_GAME;

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
        {status === 'ready' && (
          <button className="hud__reset" onClick={() => setResetSignal((n) => n + 1)}>
            Reset view
          </button>
        )}
      </header>

      <div className="stage">
        {panoId ? (
          <Panorama panoId={panoId} resetSignal={resetSignal} />
        ) : (
          <div className="loading">
            <div className="spinner" aria-hidden="true" />
            <p>Finding a spot…</p>
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
            <button
              className="btn btn--primary btn--block"
              disabled={!guess || status !== 'ready'}
              onClick={submitGuess}
            >
              {guess ? 'Make guess' : 'Click the map to place your pin'}
            </button>
            <button className="btn btn--ghost btn--block" onClick={skipRound} disabled={status !== 'ready'}>
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
