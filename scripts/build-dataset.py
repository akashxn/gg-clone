#!/usr/bin/env python3
"""
Generate src/data/panoramas.json from Panoramax (https://panoramax.xyz),
an open, keyless street-level imagery commons.

Only equirectangular (field_of_view=360) pictures are kept, since a flat
snapshot is not a GeoGuessr round. Results are thinned on a coarse grid so a
single driven street does not supply fifty near-identical locations.

Run:  python3 scripts/build-dataset.py
"""
import json, math, pathlib, urllib.parse, urllib.request
import concurrent.futures as cf
from collections import defaultdict

API = "https://api.panoramax.xyz/api/search"
OUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "data" / "panoramas.json"

# Cities probed for coverage; ones with no 360 imagery simply drop out.
CITIES = json.loads(pathlib.Path(__file__).with_name("cities.json").read_text())

GRID_DEG = 0.004      # ~400 m thinning cell
PER_CITY_CAP = 45     # keep one city from dominating the pool
SPREAD = 0.09         # offset of the quadrant probes, in degrees


def fetch(bbox, limit=40):
    q = urllib.parse.urlencode({"bbox": bbox, "filter": "field_of_view=360", "limit": limit})
    try:
        with urllib.request.urlopen(f"{API}?{q}", timeout=60) as r:
            return json.load(r).get("features", [])
    except Exception:
        return []


def collect(city):
    name, country, continent, lat, lng = city
    boxes = [f"{lng-0.3},{lat-0.3},{lng+0.3},{lat+0.3}"]
    # Two concentric rings of probes: one query returns a single sequence, so
    # spreading the boxes is what actually buys distinct locations.
    for ring in (0.06, 0.15):
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                cx, cy = lng + dx * ring, lat + dy * ring
                boxes.append(f"{cx-0.035},{cy-0.035},{cx+0.035},{cy+0.035}")

    seen_cells, out = set(), []
    for box in boxes:
        for f in fetch(box):
            try:
                lon, la = f["geometry"]["coordinates"][:2]
                href = f["assets"]["sd"]["href"]
            except (KeyError, TypeError, IndexError):
                continue

            cell = (round(la / GRID_DEG), round(lon / GRID_DEG))
            if cell in seen_cells:
                continue
            seen_cells.add(cell)

            out.append({
                "u": href,
                "lat": round(la, 6),
                "lng": round(lon, 6),
                "name": name,
                "country": country,
                "continent": continent,
            })
            if len(out) >= PER_CITY_CAP:
                return out
    return out


def main():
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(collect, CITIES))

    panos, per_country = [], defaultdict(int)
    for city, found in zip(CITIES, results):
        panos.extend(found)
        per_country[city[1]] += len(found)

    panos.sort(key=lambda p: (p["country"], p["name"], p["u"]))

    # Compact form: image hosts and place labels are extracted into lookup
    # tables, since ~2000 rows repeat a handful of each. Roughly halves the
    # file the browser downloads.
    hosts, places, rows = [], [], []
    host_idx, place_idx = {}, {}
    for p in panos:
        scheme, rest = p["u"].split("://", 1)
        host, path = rest.split("/", 1)
        origin = f"{scheme}://{host}"
        if origin not in host_idx:
            host_idx[origin] = len(hosts); hosts.append(origin)
        place = (p["name"], p["country"], p["continent"])
        if place not in place_idx:
            place_idx[place] = len(places); places.append(list(place))
        rows.append([host_idx[origin], "/" + path, p["lat"], p["lng"], place_idx[place]])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"h": hosts, "p": places, "i": rows},
                              separators=(",", ":"), ensure_ascii=False))

    countries = {c for c in per_country if per_country[c]}
    continents = {p["continent"] for p in panos}
    print(f"panoramas : {len(panos)}")
    print(f"cities    : {sum(1 for r in results if r)}/{len(CITIES)}")
    print(f"countries : {len(countries)}")
    print(f"continents: {len(continents)}  {sorted(continents)}")
    print(f"file size : {OUT.stat().st_size/1024:.0f} KB -> {OUT}")
    print("\ntop countries:")
    for c, n in sorted(per_country.items(), key=lambda x: -x[1])[:15]:
        if n: print(f"  {c:<22}{n:>4}")


if __name__ == "__main__":
    main()
