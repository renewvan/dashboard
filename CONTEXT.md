# Renewvan Dashboard

The touchscreen kiosk UI mounted in the van. It renders live van state (tanks, batteries, relays) published by the hub over MQTT, and is read at a glance by a possibly-gloved driver.

## Language

**Bus link**:
The kiosk's live MQTT-over-WebSocket connection to the van's broker — reported as the Hub dot row inside the uplink popover. Says nothing about the van's internet reachability.
_Avoid_: Connection status, router status, internet connection

**Uplink**:
The van's cellular internet connection through the router entity
(`renewvan/router/<id>/*` + `renewvan/router/health`, hub schema
`router.schema.json`): five signal tiers (0–4 bars) from RSRP (≥ -85/
-95/-105/-115 dBm), offline when the node's health says offline or
data is older than 180 s, checking until data arrives. The subject of the
header's connection status button (`UplinkStatusButton`) — the icon reports
the van's uplink; its popover's Hub dot row reports the bus link.
_Avoid_: Internet connection, WAN, network status, signal strength (alone —
it's the whole connection state, including offline/no-service)

**Status button**:
A header icon button that reports a live condition and opens a detail popover on tap; visually transparent, unlike an action button.

**Alerts toggle**:
The kiosk-local Settings → General → Alerts switch (`useAlertsEnabled`, `localStorage`, default on) that shows or hides alert toasts. Muting only suppresses the toast: the alert is still tracked and recorded in the Alerts tab's history, and an alert still open when un-muted is shown again. It does not stop the hub from raising alarms.
_Avoid_: Disable alerts, alarm off (alarms and history are unaffected)
_Avoid_: Icon button (ambiguous — could mean an action button)

**Navigation style**:
The kiosk-local choice, at Settings → General → Display → Navigation, of how Settings opens its deeper views: **subpage** (the view replaces the page, with a breadcrumb trail) or **drawer** (the view slides in from the right over the page, behind a translucent blurred backdrop). Persisted in `localStorage`, default subpage (an earlier stored value `sheet` still reads as drawer). On a phone (below 800px) Settings always uses subpage, whatever is stored; the stored choice is kept for the kiosk. Says nothing about the app's primary navigation (the sidebar rail / bottom bar).
_Avoid_: Navigation (alone — the sidebar is also navigation), layout, view mode, sheet

**Tank alarm zones** (the tank gauge fill and badge):
Three severity zones—based on the per-tank `alarm_direction`/`alarm_threshold_pct`/`alarm_restore_pct` wire fields (hub schema v0.5, published retained/static by node-tank)—shown by the gauge fill and the badge, both painted from one severity key (`lib/tank-alarm.ts`) so they never disagree:

- **Normal**: Safe level; for low-direction tanks, at/above restore (e.g. fresh ≥48%); for high-direction tanks, at/below restore (e.g. grey ≤80%). The fill is the accent, the same for every fluid; colour means severity and nothing else.
- **Caution**: Open band between threshold and restore; requires attention but not yet an alarm. The fill is `--warning`.
- **Danger**: At/past the alarm threshold (e.g. fresh ≤27%, grey ≥90%), or a sensor fault, or the hub's committed `alarm_state: alarm` (covers delay and hysteresis). The fill is `--danger`. Direct visual match: tank is draining to empty or filling to full.

The `alarm_state` wire field publishes only committed transitions (after hysteresis + delay); the dashboard reads the threshold/restore band straight off the wire to color the danger/caution zones without delay, so a driver sees the full severity story even before the hub's own alert fires. See hub's `docs/adr/0004-tank-alarm-config-published-on-wire.md` for why these are wire fields rather than a dashboard-side hardcoded mirror.
_Avoid_: Alarm state, alert state, warning state (use alarm/caution/normal zones for the colors)

**Tank settings**:
The per-tank page at Settings › Nodes › Tanks › _tank_ (`?tab=settings&view=tank&tank=<id>`), opened by the Configure button on a tank's card or row. It is meant to mirror the node's own config (the `[tank.*]` parameters of node-tank, as in [dbus-ads1115's configuration parameters](https://github.com/alexsanzder/dbus-ads1115#configuration-parameters)). Today it shows only **Enabled**, read-only: `enabled` is a node-tank `config.ini` value read at startup, with no wire field or `/set` topic to change it, and a disabled tank stops publishing and so would drop out of the list. Each setting becomes editable once the hub schema and node-tank define a command topic for it.
_Avoid_: Tank config (the node's `config.ini` is the source; this page is the dashboard's view of it)

**Start page**:
The first tab (`?tab=start`, `src/components/start/`): a **widget row** over a **cockpit row**. The widget row is three equal columns of widgets (today: Weather, which has no data source on the bus yet and so reads "Not connected", and two empty slots); the cockpit row is fresh water, battery (the focus dial, bigger) and grey water, left to right. On a phone (below 800px) it is one card per widget, battery first, with no empty slots. A dial whose record has not fully arrived over MQTT shows "No data yet", never a number.
_Avoid_: Home, dashboard (the whole app is the dashboard), overview

**Cockpit dial**:
A 270° arc gauge on the Start page: a thin continuous outer ring, a value band and a wide track, the band and the track cut at the same five angles. Colour is severity and nothing else: a tank dial is painted by the same tank alarm zones as its Tanks-tab card (via `tankView`), so a dial and its card cannot disagree; the battery dial is the accent. All dials share one geometry, so the arc ends sit a fixed share of the dial's height above its bottom edge, and each dial is offset by that share to put every arc end on one baseline whatever its size.
_Avoid_: Gauge, speedometer, radial gauge (`RadialGauge` was the old Tanks-tab component, since removed)
