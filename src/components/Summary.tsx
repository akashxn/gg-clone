import { formatDistance } from '../game/geo';
import { ROUNDS_PER_GAME, describeFilter } from '../game/rounds';
import type { Filter, RoundResult } from '../types';

interface Props {
  filter: Filter;
  results: RoundResult[];
  onPlayAgain: () => void;
  onChangeMap: () => void;
  onHome: () => void;
}

const MAX_TOTAL = ROUNDS_PER_GAME * 5000;

function verdict(pct: number): string {
  if (pct >= 0.9) return 'Outstanding.';
  if (pct >= 0.75) return 'Very sharp.';
  if (pct >= 0.5) return 'Solid run.';
  if (pct >= 0.25) return 'Room to grow.';
  return 'Rough one — the world is big.';
}

export default function Summary({ filter, results, onPlayAgain, onChangeMap, onHome }: Props) {
  const total = results.reduce((sum, r) => sum + r.score, 0);
  const pct = total / MAX_TOTAL;
  const best = results.reduce<RoundResult | null>(
    (b, r) => (b === null || r.score > b.score ? r : b),
    null,
  );

  return (
    <div className="screen screen--scroll">
      <div className="panel panel--wide">
        <p className="muted">{describeFilter(filter)} &middot; {results.length} rounds</p>
        <h2 className="summary__total">
          {total.toLocaleString()}
          <span className="summary__max"> / {MAX_TOTAL.toLocaleString()}</span>
        </h2>
        <p className="summary__verdict">{verdict(pct)}</p>

        <div className="summary__bar">
          <div className="summary__barfill" style={{ width: `${pct * 100}%` }} />
        </div>

        {best && best.score > 0 && (
          <p className="muted small">
            Best round: {best.location.name}, {best.location.country} — {best.score.toLocaleString()} pts
          </p>
        )}

        <table className="rounds">
          <thead>
            <tr>
              <th>#</th>
              <th>Location</th>
              <th className="num">Distance</th>
              <th className="num">Score</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td className="muted">{i + 1}</td>
                <td>
                  {r.location.name}
                  <span className="muted">, {r.location.country}</span>
                </td>
                <td className="num">
                  {r.distanceKm === null ? <span className="muted">skipped</span> : formatDistance(r.distanceKm)}
                </td>
                <td className="num strong">{r.score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="summary__actions">
          <button className="btn btn--primary" onClick={onPlayAgain}>Play again</button>
          <button className="btn" onClick={onChangeMap}>Change map</button>
          <button className="btn btn--ghost" onClick={onHome}>Menu</button>
        </div>
      </div>
    </div>
  );
}
