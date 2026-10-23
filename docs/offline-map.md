# Offline map

The Map page reads its basemap from `/maps/basemap.pmtiles` on the dashboard's own origin. The file
is not in the image: make it once, put it on the Pi, and mount it. Why it is built this way:
`docs/adr/0001-self-hosted-pmtiles-basemap.md`.

There are two ways to make the file:

1. **`pmtiles extract` from a Protomaps daily build.** The default. It needs only the `pmtiles` CLI
   and it has been run end to end.
2. **Build it yourself from OpenStreetMap.** **Untested end to end** (see the reason in section 2).
   Use it only if you accept that.

Both give one `.pmtiles` file. After that the steps are the same: verify it, copy it to the Pi,
check the Map page.

## 1. Make the basemap with `pmtiles extract` (default)

Install the [`pmtiles` CLI](https://docs.protomaps.com/pmtiles/cli) and cut a region out of the
current Protomaps build (daily builds: <https://maps.protomaps.com/builds>; the style needs a
version 4 build). A bounding box is `MIN_LON,MIN_LAT,MAX_LON,MAX_LAT`.

Check the size first. `--dry-run` reads only the build's directories (a few MB), prints what the
extract would transfer and write, and creates no file:

```bash
pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles basemap.pmtiles \
  --bbox=-8.7,49.8,1.9,60.9 --maxzoom=14 --dry-run
```

Then run the same command without `--dry-run`:

```bash
pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles basemap.pmtiles \
  --bbox=-8.7,49.8,1.9,60.9 --maxzoom=14
```

Measured sizes at `--maxzoom=14` (bounding boxes, build `20261022`):

| Area                             | Size   |
| -------------------------------- | ------ |
| Portugal (`-9.6,36.9,-6.1,42.2`) | 344 MB |
| Spain                            | 1.7 GB |
| Whole UK (`-8.7,49.8,1.9,60.9`)  | 1.5 GB |
| Norway                           | 4.1 GB |
| Hastings, 0.6° × 0.3°            | 7.9 MB |

These are bounding boxes, which take in sea and neighbouring land. The dry-run figure is the size of
the tile data the real run writes, to about three significant digits (the file is a little larger
for its directories). `--region=FILE.geojson` takes a country outline instead of a box and cut
Spain to about 1.1 GB and Norway to about 1.6 GB in the same dry-runs.

Each extra zoom level roughly doubles the size, so `--maxzoom=15` for a country is several times
larger. The planet is about 120 GB.

The daily builds bucket keeps the last week of builds plus the latest build of each patch version,
and Protomaps asks that its downloads are not hotlinked. Pick a build from the builds page, run
the extract once, and keep the file.

## 2. Or build it from OpenStreetMap (untested end to end)

> **Untested end to end.** The stock build, `--download` with the default sources, has never
> completed: `qrank.toolforge.org` answered HTTP 503 and the OpenStreetMap water and land polygons
> host (`osmdata.openstreetmap.de`) was unreachable from six places. Every build below used a stale
> 2024 copy of the QRank ranking and hand-made shapefiles for the water and land polygons. Only
> landlocked countries and coastal Monaco were built. Interior Andorra tiles were byte-identical to
> the Protomaps planet build on a 40-tile sample; that is a sample, not proof. **The default stays
> `pmtiles extract` until a stock build is re-run end to end with at least one coastal country.**

You build with Protomaps' tile generator, which runs on
[Planetiler](https://github.com/onthegomap/planetiler).

### What to install

- A **JDK 21 or newer**. The build's class files are version 65 (Java 21); on Java 11 the jar fails
  with `UnsupportedClassVersionError`, and `mvn package` stops at once. Tried: Temurin 21 and 25.
  Not tried: 22 to 24 and 26 or newer.
- **Apache Maven** (3.9.16 was used; 3.10.0 was not tried).
- `git` and the [`pmtiles` CLI](https://docs.protomaps.com/pmtiles/cli) (to verify the result).
- **Memory: a Java heap of about 2 GiB or more.** `-Xmx1g` and `-Xmx1500m` failed on Andorra after
  11 s with `OutOfMemoryError`; `-Xmx2g` worked. With a small heap, bigger areas get much slower
  (Luxembourg at `-Xmx2g` took 278 s instead of 111 s). Switzerland peaked at 5.7 GB of memory at
  the default heap, and finished with the same file at `-Xmx3g` (3.7 GB peak).
- Disk: several GB for the sources (below), plus temporary files while building (1.8 GB for
  Switzerland).
- The network, for the first run of an area.

There is **no prebuilt Protomaps jar**: `protomaps/basemaps` has no releases. Planetiler's own
`planetiler.jar` and its Docker image carry no Protomaps profile, so they do not produce this
tileset. The container route from the Protomaps repo was not run and is not promoted here.

### The pinned commit

`protomaps/basemaps` has no tileset tag (the only tags are `2.0.0` and `2.1.0`, from the style
package), so the guide pins a commit:

```text
protomaps/basemaps  ca93fc0   (tileset 4.15.2)
```

The research also checked `main` at `42ffaaa` (2026-09-11); its `tiles/` directory is identical to
`ca93fc0`'s.

**The pin lives here, and changes only when `@protomaps/basemaps` (the dashboard pins `^5.7.2`)
moves to a style major that the tileset supports.** The tileset and the style are versioned
separately. Protomaps' compatibility table pairs a tileset of major 4 with style majors 4 and 5; it
has no entry for a tileset of major 5. So with the dashboard on style 5.x, build a 4.x tileset.
Never follow `main` blindly: a future major bump of the tileset would produce a file the dashboard's
style cannot render. The jar prints the tileset version it will build before a long run (see below).

### Build the jar

```bash
git clone https://github.com/protomaps/basemaps
cd basemaps
git checkout ca93fc0
cd tiles
mvn clean package -DskipTests
java -jar target/protomaps-basemap-HEAD-with-deps.jar --version   # prints 4.15.2
```

The jar is named `HEAD` whatever the source: the file name says nothing about the version. A first
`mvn` run downloads about 135 MB of dependencies and took about 2.5 minutes; a rerun about 20 s.

### Build a basemap

```bash
java -Xmx2g -jar target/protomaps-basemap-HEAD-with-deps.jar \
  --download --force --area=luxembourg --maxzoom=14 --output=basemap.pmtiles
```

- `--area` is a Geofabrik extract name (<https://download.geofabrik.de>). It is matched against
  Geofabrik's whole index and fails if more than one entry matches: **`ireland`, `georgia` and
  `california` are ambiguous** (`ireland` matches `britain-and-ireland` and
  `ireland-and-northern-ireland`; `georgia` matches `georgia` and `us/georgia`; `california` matches
  `norcal`, `socal` and `us/california`). Use the full ID (for example `us/california`, which makes
  a path-like output name: pass `--output`) or pick a name that is unique. `luxembourg`, `andorra`,
  `monaco` and `switzerland` resolve cleanly.
- `--maxzoom=14` matches the dashboard (`--maxzoom=15`, the default, is about 1.8 times larger:
  Luxembourg 63 MB against 35 MB).
- `--force` overwrites an existing output; without it a second run refuses.
- **No clipping in v0.** The file covers the whole Geofabrik extract, so its bounds are the
  extract's, a little wider than the country.
- Run from the **same directory every time**: the sources are cached in `data/sources/` under the
  current directory.

**The first run needs the network.** It downloads the Geofabrik extract for your area and several
GB of shared sources into `data/sources/`: Natural Earth (446 MB), the Daylight land cover (36 MB),
the QRank ranking, the two OpenStreetMap polygon zips and a small font encoding. (Only the Natural
Earth, land cover and font encoding sizes were measured, 489 MB in all; the polygon zips and QRank
could not be sized because their hosts were down.) One failed download aborts the whole run. **A
second run for the same area works offline**; a new area needs the network again for its own
extract only.

### Measured

Measured on one Apple-silicon Mac (10 threads, 32 GiB), Temurin 21, with the substitutions above for
QRank and the polygons. Landlocked countries are at `--maxzoom=14`; Monaco is at the default,
z15. Times include a fixed 65 to 75 s Natural Earth stage.

| Area                    | Size     | Time  | Peak memory |
| ----------------------- | -------- | ----- | ----------- |
| Monaco (z15, first run) | 0.52 MB  | 96 s  | 2.8 GB      |
| Andorra (z14)           | 2.45 MB  | 84 s  | 2.9 GB      |
| Luxembourg (z14)        | 34.8 MB  | 111 s | 3.3 GB      |
| Switzerland (z14)       | 277.8 MB | 324 s | 5.7 GB      |

(Peak memory is the resident set size at the default heap, which is a quarter of the Mac's RAM. It
is the JVM using the room it is given, not the minimum: use `-Xmx2g` or more.)

**Tested only up to Switzerland, on one machine.** Coastal countries and larger ones (Norway,
Spain, the UK) are **unmeasured** for the own build. Nothing is established about Linux, Windows,
Docker or a Raspberry Pi as the build machine.

## 3. Verify the file

Whichever route made it:

```bash
pmtiles verify basemap.pmtiles
pmtiles show basemap.pmtiles
```

Both exit 0 on a good file and **exit 1 on a killed build or a truncated file** (for example
`Failed to verify archive, Tile data offset=... out of bounds`). `pmtiles show` also prints the
tileset `version` (it must start with `4.` for the dashboard's style) and the bounds, so you can
check the file covers where you will be. Both work offline.

## 4. Copy it to the Pi

Use the hub's push script. It verifies the file, replaces the running map safely and checks the
result. What it needs on the Pi, the path, the `.env` key and the placeholder file are the hub's
side: see the [hub README](https://github.com/renewvan/hub) and do not copy them here.

```bash
scripts/push-basemap.sh basemap.pmtiles [--host <ssh-alias>]
```

(Run from the hub checkout. The script and its README section are specified in the hub's companion
issue, <https://github.com/renewvan/hub/issues/69>.)

By hand, the sequence it follows is: copy to a temporary name beside the live file, move it into
place, restart the dashboard container, then check the result (below). A plain `mv` over the live
file is not enough, because a single-file mount pins the old file until the container restarts;
copying over the live file in place would let a map read a half-written archive.

```bash
scp basemap.pmtiles <pi>:<basemap path on the Pi>.new
ssh <pi> 'mv <basemap path on the Pi>.new <basemap path on the Pi> && docker restart renewvan-dashboard'
```

`<basemap path on the Pi>` is the host path the hub README gives for the file.

## 5. Mount it

Mount the single file, never the `maps/` directory: the fonts and sprites are in the image at the
same path and a directory mount would hide them. The hub's `docker-compose.yml` does this on the
`dashboard:` service (its path comes from the hub README):

```yaml
    volumes:
      - <basemap path on the Pi>:/usr/share/nginx/html/maps/basemap.pmtiles:ro
```

## 6. Check it

```bash
curl -sI -H 'Range: bytes=0-16383' http://<hub>/maps/basemap.pmtiles   # HTTP/1.1 206
curl -sI http://<hub>/maps/nope.pmtiles                                # HTTP/1.1 404
```

`206` means range requests work. The `404` must be a real 404, not the dashboard's `index.html`.
The first response must carry **no** `Cache-Control: no-cache`: with it a browser revalidates every
tile read and a `304` breaks the reader (see `nginx.conf`).

Then open the Map page with a GPS fix inside the file's area: streets, water and labels with the van
on them. That is the check that matters; a `206` only proves the file is being served.

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

| Situation                           | Map                                 |
| ----------------------------------- | ----------------------------------- |
| Van inside the file's area          | Streets, water, labels, the van     |
| Van outside the file's area         | Empty background with the van on it |
| `basemap.pmtiles` not mounted (404) | The same empty map                  |

Nothing falls back to the internet. The Map page has no separate "no map file" message: with no
file, or no tiles under the van, the tiles fail to load and the page shows the style's empty
background with the van on it. (Until the first GPS fix the page shows its "No GPS data yet." or
"No GPS fix yet" message instead of any map.)

**Not established.** Two other states of a missing map were seen only as HTTP statuses on a real
Pi, never as what the Map page draws, so this guide does not say what the page does:

- a **zero-byte placeholder file**, which nginx serves as a `200` with 0 bytes;
- a **missing mount source**, where Docker creates a root-owned directory and nginx answers `301`
  instead of `404`.

To update the file, replace it and restart the dashboard container. A kiosk already showing the map
notices the new file on its next tile read (the reader compares the file's ETag and reloads on a
change); reloading the page also works.

## Redistributing a basemap

If you **share** a basemap file you built, credit its data:

- **OpenStreetMap contributors**, under the ODbL (<https://www.openstreetmap.org/copyright>). The
  OpenStreetMap-derived water and land polygons are ODbL too.
- **Natural Earth**, public domain: crediting it is optional ("Made with Natural Earth.").
- **ESA WorldCover**, CC-BY 4.0, the source of the land cover in the file. Protomaps asks for the
  credit when the land cover layer is displayed; whether the dashboard's style draws that layer was
  not established, so credit it when you share the file.

Protomaps asks that if you distribute a modified fork of its tilesets or styles, or run a tiles
*service* based on them, you name it something different from Protomaps. Building a file for
yourself does not trigger that.

These are how the licences read, not legal advice. The dashboard's own credits live under
Settings → General → About.
