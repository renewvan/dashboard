# Offline map

The Map page reads its basemap from `/maps/basemap.pmtiles` on the dashboard's own origin. The
file is not in the image: make it once, put it on the Pi, and mount it. Why it is built this way:
`docs/adr/0001-self-hosted-pmtiles-basemap.md`.

## 1. Make the extract

Install the [`pmtiles` CLI](https://docs.protomaps.com/pmtiles/cli) and cut a region out of the
current Protomaps build (daily builds: <https://maps.protomaps.com/builds>; the style needs a
version 4 build). A bounding box is `MIN_LON,MIN_LAT,MAX_LON,MAX_LAT`.

```bash
pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles basemap.pmtiles \
  --bbox=-8.7,49.8,1.9,60.9 --maxzoom=14
pmtiles verify basemap.pmtiles
```

Measured sizes at `--maxzoom=14`:

| Area                         | Size   |
| ---------------------------- | ------ |
| Whole UK (`-8.7,49.8,1.9,60.9`) | 1.5 GB |
| Hastings, 0.6° × 0.3°        | 7.9 MB |

Each extra zoom level roughly doubles the size, so `--maxzoom=15` for a country is several times
larger. The planet is about 120 GB. Check the size with `--dry-run` before downloading.

## 2. Mount it

Mount the single file, never the `maps/` directory: the fonts and sprites are in the image at the
same path and a directory mount would hide them. In the hub's `docker-compose.yml`, on the
`dashboard:` service:

```yaml
    volumes:
      - ./config/dashboard/basemap.pmtiles:/usr/share/nginx/html/maps/basemap.pmtiles:ro
```

## 3. Check it

```bash
curl -sI -H 'Range: bytes=0-16383' http://<hub>/maps/basemap.pmtiles   # HTTP/1.1 206
curl -sI http://<hub>/maps/nope.pmtiles                                # HTTP/1.1 404
```

`206` means range requests work. The `404` must be a real 404, not the dashboard's `index.html`.
The first response must carry **no** `Cache-Control: no-cache`: with it a browser revalidates every
tile read and a `304` breaks the reader (see `nginx.conf`).

## Seeing the map in `vp dev`

`vp dev` has no nginx, so there is no mounted file. Fonts and sprites already work (Vite serves
`public/maps/`); only the tiles are missing, and the map is empty until you add them. Cut a small
extract around where you are testing (a 0.6° x 0.3° box is under 10 MB) and drop it in `public/`:

```bash
pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles public/maps/basemap.pmtiles \
  --bbox=0.30,50.75,0.90,51.05 --maxzoom=14
```

`public/maps/basemap.pmtiles` is git-ignored. Then run `vp dev` with a GPS fix inside the box
(`renewvan/gps/<id>/latitude` and `longitude`, plus `fix_quality` and `satellites_in_use`), or use
Demo mode. A fix outside the box shows the empty map with the van on it.

`vp dev` can show a blank map after a page reload. Vite sends `Cache-Control: no-cache` for files in
`public/`, so the browser revalidates each range read, the dev server answers `304`, and the reader
treats that as an error. Hard-reload, or turn on "Disable cache" in DevTools, and the map loads.
The container's nginx sends no `Cache-Control` for `/maps/`; confirm it once with the `curl`
commands under "Check it".

## What the van shows

| Situation                                | Map                                   |
| ---------------------------------------- | ------------------------------------- |
| Van inside the extract                   | Streets, water, labels, the van       |
| Van outside the extract                  | Empty background with the van on it   |
| `basemap.pmtiles` not mounted (404)      | The same empty map                    |

Nothing falls back to the internet. To update the file, replace it and restart the dashboard
container. A kiosk already showing the map notices the new file on its next tile read (the reader
compares the file's ETag and reloads on a change); reloading the page also works.
