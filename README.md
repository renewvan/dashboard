# dashboard

Read-only React dashboard for the renewvan hub's renewvan bus — one responsive
app serving both the 7" in-van kiosk touchscreen (800×480 landscape) and a
laptop browser. Per
`hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md`, built
from the layout decided in `hub`'s throwaway `prototype/dashboard-06`
branch (variant C: domain tabs + radial gauges).

Connects **directly** to the renewvan bus broker over MQTT-over-WebSocket
(Mosquitto's WS listener) from the browser — no polling backend, not
offline-first. A dropped connection renders a clear "disconnected"
banner, distinguishable from legitimate last-known-state values (every
renewvan-bus topic is retained, so a fresh connection shows real state
immediately, not a blank screen).

## Layout

Three domain tabs, same tabbed interaction at every supported width:

| Tab      | Content                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tanks    | Radial gauge per tank (`level_pct`), liters-remaining readout, sensor-fault status in place of the readout when `status != ok`                   |
| Power    | Radial gauge per battery (`soc_pct`), voltage/current/power/temperature readout, `charge_state` badge                                            |
| Switches | One row per relay: dashboard-side `id → label` mapping + on/off indicator — **read-only**, no tap-to-toggle (`relay` has no command topic in v0) |

## Architecture

- `src/hooks/useRenewvanBus.ts` — the adapter: owns the MQTT client, subscribes
  `renewvan/#`, accumulates retained messages into a `RenewvanBusState`, exposes
  connection status. Not unit-tested (thin wrapper around `mqtt.js`), per
  the v0 spec's Testing Decisions.
- `src/components/*` — presentational components (`RadialGauge`,
  `RelayRow`, `Tabs`, `ConnectionBanner`), each unit-tested against fixed
  props matching the v0.1 schema shapes (`hub/schema/*.schema.json`).
- `src/tabs/*` — per-domain composition of the presentational components
  over `RenewvanBusState`, also unit-tested against fixture entity maps.
- `src/config/relayLabels.ts` — dashboard-side `id → label` map for the
  Switches tab (label is presentation-only, not a wire field).

## Configuration

All config is Vite build-time env vars (`VITE_*`), see `.env.example`:

| Variable                                    | Default               | Notes                                                                   |
| ------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `VITE_MQTT_WS_URL`                          | _(required)_          | Mosquitto's WS listener, browser-reachable, e.g. `ws://<host>:9001`     |
| `VITE_MQTT_USERNAME` / `VITE_MQTT_PASSWORD` | _(none)_              | Read-scoped credentials; blank while the broker allows anonymous access |
| `VITE_RELAY_LABELS`                         | _(built-in defaults)_ | JSON `id -> label` override for the Switches tab                        |

## Running

```bash
npm install
cp .env.example .env   # set VITE_MQTT_WS_URL at minimum
npm run dev
```

## Testing

```bash
npm install
npx vitest run
```

Presentational-component and tab tests run against fixed props/fixture
entity maps only — no live MQTT connection required.

## Building / deploying

```bash
npm run build   # static output in dist/
docker build -t dashboard .
docker run -p 8080:80 dashboard
```

The Dockerfile builds the static bundle and serves it via nginx
(`nginx.conf`). `VITE_*` vars are build-time — bake them into the image
(or run `npm run build` with them set) rather than expecting a
container-runtime override.

## Releasing

Tagging a GitHub release builds and publishes
`ghcr.io/<owner>/dashboard:<tag>`, which `hub`'s deployment compose file
pins by tag (never builds from source — see
`hub/docs/adr/0001-compose-services-via-pinned-images-not-git-submodules.md`).

## Manual verification

Automated tests cover the presentational layer only. Before relying on
this in the van, verify against real hardware/broker:

- Load on an actual 7" touchscreen (or an 800×480 simulator) and a laptop
  browser against the real renewvan bus; confirm both wired tanks (`fresh`,
  `grey`), the house battery, and all 8 relay channels render live data
  once `tank`/`battery`/`relay` upstream components are publishing.
  (Ticket 06 item 5 — not verifiable from this environment: no physical
  kiosk display or reachable renewvan-bus broker here.)
- Kill the broker connection and confirm the connection-lost banner
  appears instead of stale-looking numbers.
