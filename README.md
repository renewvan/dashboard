# dashboard

Read-only React dashboard for the renewvan hub's renewvan bus — one responsive
app serving both the 7" in-van kiosk touchscreen (800×480 landscape) and a
laptop browser. Per
`hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md`, built
from the layout decided in `hub`'s throwaway `prototype/dashboard-06`
branch (variant C: domain pages + radial gauges).

Connects **directly** to the renewvan bus broker over MQTT-over-WebSocket
(Mosquitto's WS listener) from the browser — no polling backend, not
offline-first. A dropped connection renders a clear "disconnected"
banner, distinguishable from legitimate last-known-state values (every
renewvan-bus topic is retained, so a fresh connection shows real state
immediately, not a blank screen).

## Layout

Three domain pages, same tabbed navigation at every supported width:

| Page   | Content                                                                                                                                                                                                                                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tanks  | Radial gauge per tank (`level_pct`), liters-remaining readout, sensor-fault status in place of the readout when `status != ok`                                                                                                                                                                                                                                                        |
| Power  | Tiles or Orbs diagram (Settings › Display & Appearance › Power page): solar, alternator and shore charger into the battery (`soc_pct`, voltage, current, power, time to go), out to the derived loads                                                                                                                                                                                 |
| GPS    | OpenStreetMap centred on the hub's fix (`latitude`, `longitude`) with a marker and a fix quality / satellites / speed readout; a message in place of the map until the first fix                                                                                                                                                                                                      |
| Relays | Titled panels of labelled Off \| On controls, one per relay, labelled by the relay's wire `name` (else its id). A critical load asks before switching; a command that does not take effect in 4 seconds reads "Didn't switch" with Retry; an offline relay device reads Unknown with every control disabled; Demo mode disables every control. `state` means latched, never energised |

## Architecture

- `src/hooks/useRenewvanBus.ts` — the adapter: owns the MQTT client, subscribes
  `renewvan/#`, accumulates retained messages into a `RenewvanBusState`, exposes
  connection status. Not unit-tested (thin wrapper around `mqtt.js`), per
  the v0 spec's Testing Decisions.
- `src/components/*` — presentational components (`RelaysPage`, `Tabs`,
  `ConnectionBanner`), each unit-tested against fixed
  props matching the v0.1 schema shapes (`hub/schema/*.schema.json`).
- `src/components/*/*Page.tsx` — per-domain composition of the presentational components
  over `RenewvanBusState`, also unit-tested against fixture entity maps.
- `src/config/relayPanels.ts` — dashboard-side groups, icons and critical loads for the
  Relays page, keyed by channel id (presentation only, never on the wire). It ships empty:
  every channel lands in "Unassigned" until you list it. The label is the relay's wire `name`.

## Configuration

All config is Vite build-time env vars (`VITE_*`), see `.env.example`:

| Variable                                    | Default      | Notes                                                                   |
| ------------------------------------------- | ------------ | ----------------------------------------------------------------------- |
| `VITE_MQTT_WS_URL`                          | _(required)_ | Mosquitto's WS listener, browser-reachable, e.g. `ws://<host>:9001`     |
| `VITE_MQTT_USERNAME` / `VITE_MQTT_PASSWORD` | _(none)_     | Read-scoped credentials; blank while the broker allows anonymous access |

## Running

```bash
vp install
cp .env.example .env   # set VITE_MQTT_WS_URL at minimum
vp dev
```

## Testing

```bash
vp install
vp test
```

Presentational-component and page tests run against fixed props/fixture
entity maps only — no live MQTT connection required.

## Building / deploying

```bash
vp run build   # type-checks (`vp check`), then bundles to dist/ (`vp build`)
docker build -t dashboard .
docker run -p 8080:80 dashboard
```

The Dockerfile builds the static bundle and serves it via nginx
(`nginx.conf`). `VITE_*` vars are build-time — bake them into the image
(or run `vp run build` with them set) rather than expecting a
container-runtime override.

## Releasing

Start a release from **Actions → Release → Run workflow**, or
`gh workflow run release.yml -f bump=patch` (`minor`, `major`, or `-f version=0.2.0`
to set it explicitly). One run works out the next version from the latest `v*` tag,
commits the `package.json` bump (`chore: release vX.Y.Z`) to `main`, tags that commit,
creates the GitHub release and builds and publishes
`ghcr.io/<owner>/dashboard:<tag>` (and `:latest`) from it, so `main` always holds the
version of its latest release, which the Firmware page shows. `hub`'s deployment
compose file pins the image by tag (never builds from source — see
`hub/docs/adr/0001-compose-services-via-pinned-images-not-git-submodules.md`).

A beta from a feature branch: dispatch the workflow on that branch with **prerelease**
ticked. It runs the tests, publishes only its own tag (never `:latest`) and writes nothing
to `main`. The process is shared by every renewvan repo and lives in `hub` (`hub/docs/adr/0015-one-release-process-via-reusable-workflows.md`);
this repo's `release.yml` only says what it ships.

## Manual verification

Automated tests cover the presentational layer only. Before relying on
this in the van, verify against real hardware/broker:

- Load on an actual 7" touchscreen (or an 800×480 simulator) and a laptop
  browser against the real renewvan bus; confirm both wired tanks (`fresh`,
  `grey`), the house battery, and all 16 relay channels render live data
  once `tank`/`battery`/`relay` upstream components are publishing.
  (Ticket 06 item 5 — not verifiable from this environment: no physical
  kiosk display or reachable renewvan-bus broker here.)
- Kill the broker connection and confirm the connection-lost banner
  appears instead of stale-looking numbers.
