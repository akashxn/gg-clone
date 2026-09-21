# GG Clone

A GeoGuessr-style geography game. You're dropped into a 360° street-level
panorama somewhere on Earth, you look around and walk down the street for
clues, then drop a pin on a world map. Ten rounds, scored by distance.

**No API keys. No accounts. No billing. Nothing to sign up for.**
Open the page and play.

Single player only — multiplayer is a deliberate placeholder.

## Where the imagery comes from

[Panoramax](https://panoramax.xyz) — an open, federated commons of
street-level imagery run by IGN and the OpenStreetMap community. The API needs
no key and no account, and the pictures are openly licensed.

This matters because Google Street View, the obvious choice, serves nothing
without an API key tied to a billing account. Panoramax has no such gate.

Only equirectangular pictures (`field_of_view=360`) are used, so every round is
a real look-around rather than a flat snapshot.

The guess map is [Leaflet](https://leafletjs.com) with OpenStreetMap tiles —
also keyless.

### Coverage, honestly

**2,039 panoramas · 85 cities · 41 countries · all 6 continents.**

Panoramax is contributor-driven, so coverage is uneven in a way Google's is not:

| Continent | Panoramas | Notes |
| --- | --- | --- |
| Europe | 1,239 | Dense — France, Germany, Belgium, Netherlands, Switzerland |
| Asia | 238 | Mostly Japan and Taiwan |
| North America | 233 | US and Canada |
| South America | 209 | Argentina and Brazil |
| Oceania | 91 | New Zealand, New Caledonia, French Polynesia |
| Africa | 29 | **Réunion only** — the real weak spot |

So a World game leans European, and Africa is barely represented. That is the
honest price of using free open imagery instead of a paid API. Continent and
country filters let you play a region deliberately.

Countries with fewer than five panoramas are hidden from the country picker —
a ten-round game of the same two images is not a game — but they still appear
in World and continent games.

To refresh or expand the pool as contributors add imagery:

```bash
python3 scripts/build-dataset.py     # rewrites src/data/panoramas.json
```

Add entries to `scripts/cities.json` to probe new places; cities with no 360
coverage drop out on their own.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run typecheck`.

## Deploying to Cloudflare

Deploys as a **Worker with static assets** — Cloudflare's default when you
connect a Git repo. `wrangler.jsonc` is committed:

```jsonc
{
  "name": "gg-clone",
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" }
}
```

No `main`, so nothing runs server-side. The explicit config also stops
`wrangler deploy` from trying to auto-configure a Vite integration, which
requires Vite 6+ and fails on this project's Vite 5.

Dashboard settings: build command `npm run build`, output directory `dist`,
production branch `main`. `.node-version` pins Node 22.

If you would rather use Pages: create a Pages project, drop the deploy command,
and add `public/_redirects` containing `/*  /index.html  200`.

## How it works

| Path | Role |
| --- | --- |
| `scripts/build-dataset.py` | Queries Panoramax, thins results, writes the pool |
| `src/data/panoramas.json` | 2,039 panoramas in a compact lookup-table form |
| `src/data/locations.ts` | Expands that into the playable pool |
| `src/game/geo.ts` | Haversine, bearing, scoring curve, map sizing |
| `src/game/rounds.ts` | Filtering and round selection |
| `src/game/panoramax.ts` | Neighbour lookup for walking down the street |
| `src/components/Panorama.tsx` | Pannellum WebGL 360 viewer |
| `src/components/GuessMap.tsx` | Leaflet guess map |
| `src/components/Game.tsx` | Round loop: drop → look → walk → guess → reveal |

### Scoring

GeoGuessr's published curve:

```
score = 5000 · e^(−10 · distance / mapSize)
```

`mapSize` is the diagonal of the bounding box of the pool you picked, so a miss
is graded against the area in play — 300 km off is near-perfect on World and
terrible inside one country. Ten rounds, 50,000 maximum.

### Movement

`Move ↑` steps to a nearby panorama. Panoramax returns each picture's camera
heading (`view:azimuth`), which is combined with the viewer's yaw to work out
which way you are actually facing, so you walk the direction you are looking.
When an instance publishes no heading, it falls back to the nearest unvisited
panorama. `Back to drop` returns you to the start.

Your guess is always scored against the **drop point**, not wherever you
wandered to — same as GeoGuessr.

## Known limitations

- **Multiplayer is a stub.** It renders a "not built yet" screen.
- **Africa is essentially unrepresented** (Réunion only), and World games skew
  European. A limitation of the free imagery, not of the code.
- **No persistence** — no accounts, scores, or leaderboards.
- **No round timer.** Rounds are untimed.
- **Fixed at 10 rounds**, not configurable in the UI.
- **Movement is approximate.** It hops between nearby pictures rather than
  following a road graph, so it can dead-end where coverage is sparse.
- **OpenStreetMap tiles** are used directly, which is fine at this traffic
  level; a busy deployment should move to a dedicated tile provider per the
  [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Attribution

Street-level imagery from [Panoramax](https://panoramax.xyz) contributors,
under the licence each picture carries (largely CC-BY-SA and etalab-2.0).
Map tiles © OpenStreetMap contributors. 360 rendering by
[Pannellum](https://pannellum.org) (MIT).

An independent educational project, not affiliated with GeoGuessr AB.
