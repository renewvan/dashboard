# 0001. The Map page draws a self-hosted PMTiles basemap with MapLibre

Status: accepted

Amended 2026-10-23: the last Decision bullet originally said the map is a plain empty map both
outside the extract and with the file missing. With the file missing or unreadable it now also shows
a small notice, so a fresh install does not look broken; the Consequences changed to match.

## Context

The Map page used Leaflet with raster tiles fetched live from `tile.openstreetmap.org`. The kiosk is
in a van, often on a weak cellular link or none, so the map was blank exactly when it was needed,
and every view hit a third-party server (whose tile usage policy also discourages embedded use).

## Decision

- **MapLibre GL** (`maplibre-gl`, through `react-map-gl/maplibre`) replaces Leaflet.
- The basemap is **Protomaps vector tiles in one PMTiles archive**, read by the browser with HTTP
  range requests (`pmtiles`). nginx serves it as a plain static file; there is no tile server.
- The archive is **a regional extract, not in the image**: one country, `--maxzoom=14` (the UK is
  about 1.5 GB). The hub bind-mounts that single file at `/usr/share/nginx/html/maps/basemap.pmtiles`
  (`docs/offline-map.md`).
- **Fonts and sprites are vendored in the image** (`public/maps/`, about 14 MB, SIL OFL), because
  labels and icons need them and they are small and change with the style, not the region.
- The paths are **fixed and same-origin** (`/maps/...`), like `/mqtt`, so there is no new env var.
- **Outside the extract the map is empty with the van on it; with the file missing or unreadable it
  is the same empty map plus a small notice** saying the offline map is unavailable. Nothing falls
  back to the network.

## Consequences

- The van's map works with no internet, and no tile request leaves the LAN. (The place name under
  the readout still asks Nominatim and simply stays blank when offline; that is a separate
  feature.)
- The JS bundle grows by about 970 kB (256 kB gzipped), and MapLibre's worker (519 kB) is a separate
  asset. `useMapLibreSetup` registers it with `setWorkerUrl`: a bundler cannot see that reference,
  and without it the map silently stays blank.
- An operator must produce and mount a regional extract; a fresh install shows an empty map with a
  notice pointing at `docs/offline-map.md`, the runbook, until they do.
- Basemap data is OpenStreetMap-derived (ODbL): the attribution control stays visible.
- Bumping `@protomaps/basemaps` can request new font stacks or sprite names; re-vendor `public/maps/`
  (`public/maps/README.md`).
