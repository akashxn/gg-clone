# GG Clone

A GeoGuessr-style geography game. You're dropped into a Street View panorama
somewhere on Earth, you pan around looking for clues, and you drop a pin on a
world map. Ten rounds, scored by how close you got.

Single player only — multiplayer is a deliberate placeholder.

## Requirements: a Google Maps API key

The panoramas come from Google Street View, and Google serves no panorama
imagery without an API key. There is no keyless workaround: the app asks for a
key on first run and stores it in the browser's `localStorage`. **No key is
committed to this repository.**

To get one (a few minutes, free tier is generous):

1. Create an API key at the
   [Google Maps Platform credentials page](https://console.cloud.google.com/google/maps-apis/credentials).
2. On the same project, enable **Maps JavaScript API** and **Street View Static API**.
3. Launch the app and paste the key when prompted.

Before deploying anywhere public, **restrict the key to your own domain** in the
Google console. An unrestricted key embedded in a public site can be used by
anyone and billed to you.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production bundle into `dist/`),
`npm run preview`, `npm run typecheck`.

## Deploying to Cloudflare

This deploys as a **Worker with static assets** — Cloudflare's current default
when you connect a Git repo, and what the dashboard sets up as
`Worker Name: gg-clone` with a deploy command of `npx wrangler deploy`.

`wrangler.jsonc` is committed and does the work:

```jsonc
{
  "name": "gg-clone",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

There is no `main`, so every request is served from the build — no Worker
script runs. Two things this deliberately avoids:

- **No framework auto-detection.** Without a config, `wrangler deploy` tries to
  auto-configure a Vite integration and fails on Vite 5 with *"cannot be
  automatically configured, please update to at least 6.0.0"*. An explicit
  config skips that path entirely, so Vite 5 is fine.
- **No `_redirects` file.** That is a Pages mechanism; its `/* /index.html 200`
  rewrite is ignored by Workers Assets. `not_found_handling` is the Workers
  equivalent and is what makes deep links work here.

Wrangler is pinned as a devDependency so CI and local runs agree.

Build settings in the dashboard: build command `npm run build`, output
directory `dist`, production branch `main`. `.node-version` pins Node 22.

### If you would rather use Pages

Create a Pages project instead of a Workers one, drop the deploy command, and
re-add `public/_redirects` containing `/*  /index.html  200`. Pages ignores
`wrangler.jsonc` for static builds. Workers with static assets is Cloudflare's
recommended path for new projects, so that is what is set up here.

## How it works

| Path | Role |
| --- | --- |
| `src/data/locations.ts` | 265 curated locations with country + continent |
| `src/game/geo.ts` | Haversine distance, scoring curve, map sizing |
| `src/game/rounds.ts` | Filtering and round selection |
| `src/game/streetview.ts` | Maps API loading, key storage, panorama lookup |
| `src/components/Game.tsx` | Round loop: find pano → guess → reveal → next |
| `src/components/GuessMap.tsx` | Leaflet guess map (OpenStreetMap tiles, no key) |
| `wrangler.jsonc` | Cloudflare Workers static-asset config |

### Scoring

GeoGuessr's published curve:

```
score = 5000 * e^(-10 * distance / mapSize)
```

`mapSize` is the diagonal of the bounding box of whatever pool you selected, so
a miss is graded against the size of the area in play — being 300 km off is
near-perfect on the World map and terrible on a single-country map. Ten rounds
gives a 50,000 maximum.

### Location data

The dataset is deliberately biased toward countries with official Street View
coverage. Countries Google doesn't cover (Morocco, China, most of Central Asia)
are omitted rather than left to fail at runtime. When a curated point still has
no panorama nearby, `Game.tsx` widens the search radius to 20 km and then falls
through to other unused locations in the pool, so a coverage gap costs a moment
rather than the round.

## Known limitations

These are MVP boundaries, not bugs:

- **Multiplayer is a stub.** It renders a "not built yet" screen.
- **No persistence.** Scores are not stored; there are no accounts or leaderboards.
- **No timer.** Rounds are untimed.
- **Fixed round count.** Ten rounds, not configurable in the UI.
- **Curated locations, not random sampling.** Real GeoGuessr samples road
  networks, so it can drop you on an anonymous rural road. This drops you near
  one of 265 known places, which makes for easier, more city-heavy rounds.
- **OpenStreetMap tiles** are used directly. Fine at this traffic level; a busy
  deployment should move to a proper tile provider per the
  [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Attribution

Map tiles © OpenStreetMap contributors. Panorama imagery © Google. This is an
independent educational project and is not affiliated with GeoGuessr AB.
