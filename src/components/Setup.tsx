import { useMemo, useState } from 'react';
import { CONTINENTS, COUNTRIES } from '../data/locations';
import { ROUNDS_PER_GAME, poolFor } from '../game/rounds';
import type { Continent, Filter } from '../types';

interface Props {
  onStart: (filter: Filter) => void;
  onBack: () => void;
}

type Tab = 'world' | 'continent' | 'country';

export default function Setup({ onStart, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('world');
  const [continent, setContinent] = useState<Continent>('Europe');
  const [country, setCountry] = useState<string>(COUNTRIES[0].name);
  const [search, setSearch] = useState('');

  const filter: Filter = useMemo(() => {
    if (tab === 'continent') return { kind: 'continent', continent };
    if (tab === 'country') return { kind: 'country', country };
    return { kind: 'world' };
  }, [tab, continent, country]);

  const poolSize = poolFor(filter).length;

  const visibleCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="screen screen--center">
      <div className="panel">
        <button className="linkback" onClick={onBack}>
          &larr; Menu
        </button>

        <h2 className="panel__title">Choose your map</h2>
        <p className="muted">
          {ROUNDS_PER_GAME} rounds. Narrower maps score harder — distances are graded against the
          size of the area you pick.
        </p>

        <div className="tabs" role="tablist">
          {(['world', 'continent', 'country'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`tab ${tab === t ? 'tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'world' ? 'World' : t === 'continent' ? 'Continent' : 'Country'}
            </button>
          ))}
        </div>

        <div className="tabpanel">
          {tab === 'world' && (
            <p className="tabpanel__blurb">
              Anywhere on Earth — all {poolFor({ kind: 'world' }).length} locations in play.
            </p>
          )}

          {tab === 'continent' && (
            <div className="chips">
              {CONTINENTS.map((c) => (
                <button
                  key={c}
                  className={`chip ${continent === c ? 'chip--active' : ''}`}
                  onClick={() => setContinent(c)}
                >
                  {c}
                  <span className="chip__count">{poolFor({ kind: 'continent', continent: c }).length}</span>
                </button>
              ))}
            </div>
          )}

          {tab === 'country' && (
            <>
              <input
                className="input"
                placeholder="Search countries…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="countrylist">
                {visibleCountries.map((c) => (
                  <button
                    key={c.name}
                    className={`countryrow ${country === c.name ? 'countryrow--active' : ''}`}
                    onClick={() => setCountry(c.name)}
                  >
                    <span>{c.name}</span>
                    <span className="chip__count">{c.count}</span>
                  </button>
                ))}
                {visibleCountries.length === 0 && (
                  <p className="muted countrylist__empty">No countries match “{search}”.</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="panel__footer">
          <span className="muted">
            {poolSize} location{poolSize === 1 ? '' : 's'} in this pool
            {poolSize > 0 && poolSize < ROUNDS_PER_GAME ? ' — some will repeat' : ''}
          </span>
          <button
            className="btn btn--primary"
            disabled={poolSize === 0}
            onClick={() => onStart(filter)}
          >
            Start game
          </button>
        </div>
      </div>
    </div>
  );
}
