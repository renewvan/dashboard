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
The kiosk-local Settings → General → Alerts switch (`useAlertsEnabled`, `localStorage`, default on) that shows or hides alert toasts. Muting only suppresses the toast: the alert is still tracked and recorded in the Alerts page's history, and an alert still open when un-muted is shown again. It does not stop the hub from raising alarms.
_Avoid_: Disable alerts, alarm off (alarms and history are unaffected)
_Avoid_: Icon button (ambiguous — could mean an action button)

**Navigation style**:
The kiosk-local choice, at Settings → General → Display → Navigation, of how Settings opens its deeper views: **subpage** (the view replaces the page, with a breadcrumb trail) or **drawer** (the view slides in from the right over the page, behind a translucent blurred backdrop). Persisted in `localStorage`, default subpage (an earlier stored value `sheet` still reads as drawer). On a phone (below 800px) Settings always uses subpage, whatever is stored; the stored choice is kept for the kiosk. Says nothing about the app's primary navigation (see **Navbar position**).
_Avoid_: Navigation (alone — the sidebar is also navigation), layout, view mode, sheet

**Navbar position**:
The kiosk-local choice, at Settings → General → Display → Navbar position, of where the app's primary navigation lives: **left** (a closed icon-only rail under the header, beside the pages) or **bottom** (a bar under the pages). On the kiosk the navbar is a translucent, blurred **overlay** that never pushes the pages: it floats over them, and a page that must not run under it (today the Start page) pads itself by the edge it covers (56px left, 45px bottom), which the app shell publishes as `--navbar-inset-left` / `--navbar-inset-bottom`. The pages that fill their pane (e.g. Tanks) ignore it, so the translucent navbar floats over their bottom edge. Either one **auto-hides**: it slides away (the rail to the left, the bar downwards) after about 4s without a touch or key, the inset drops to 0 so the Start page stretches into the freed space, and a touch anywhere on the screen brings it back and the Start page makes room again; a pointer merely moving does not. A pin button on the navbar (under the last tab on the rail, at the end of the bar) turns auto-hiding off; that pin resets on reload. Persisted in `localStorage` (`useNavbarPosition`), default left. The header spans the full width in both, always carries the full lockup, and has no background on the kiosk; its padding is the same 16px as the pages'. On a phone (below 800px) the navigation is always a bottom bar that never hides and stays in the layout (solid surface background, pages end above it), with the header on a surface background, whatever is stored; the stored choice is kept for the kiosk.
_Avoid_: Sidebar position, nav style (that is Navigation style, which is about Settings' own views)

**Tank alarm zones** (the tank gauge fill and badge):
Three severity zones—based on the per-tank `alarm_direction`/`alarm_threshold_pct`/`alarm_restore_pct` wire fields (hub schema v0.5, published retained/static by node-tank)—shown by the gauge fill and the badge, both painted from one severity key (`lib/tank-alarm.ts`) so they never disagree:

- **Normal**: Safe level; for low-direction tanks, at/above restore (e.g. fresh ≥48%); for high-direction tanks, at/below restore (e.g. grey ≤80%). The fill is the accent, the same for every fluid; colour means severity and nothing else.
- **Caution**: Open band between threshold and restore; requires attention but not yet an alarm. The fill is `--warning`.
- **Danger**: At/past the alarm threshold (e.g. fresh ≤27%, grey ≥90%), or a sensor fault, or the hub's committed `alarm_state: alarm` (covers delay and hysteresis). The fill is `--danger`. Direct visual match: tank is draining to empty or filling to full.

The `alarm_state` wire field publishes only committed transitions (after hysteresis + delay); the dashboard reads the threshold/restore band straight off the wire to color the danger/caution zones without delay, so a driver sees the full severity story even before the hub's own alert fires. See hub's `docs/adr/0004-tank-alarm-config-published-on-wire.md` for why these are wire fields rather than a dashboard-side hardcoded mirror.
_Avoid_: Alarm state, alert state, warning state (use alarm/caution/normal zones for the colors)

**Tank settings**:
The per-tank page at Settings › Nodes › Tanks › _tank_ (`?page=settings&view=tank&tank=<id>`), opened by the Configure button on a tank's card or row. It is meant to mirror the node's own config (the `[tank.*]` parameters of node-tank, as in [dbus-ads1115's configuration parameters](https://github.com/alexsanzder/dbus-ads1115#configuration-parameters)). Today it shows only **Enabled**, read-only: `enabled` is a node-tank `config.ini` value read at startup, with no wire field or `/set` topic to change it, and a disabled tank stops publishing and so would drop out of the list. Each setting becomes editable once the hub schema and node-tank define a command topic for it.
_Avoid_: Tank config (the node's `config.ini` is the source; this page is the dashboard's view of it)

**Start page**:
The first page (`?page=start`, `src/components/start/`): the **Dial** on the kiosk, edge to edge, or one card per widget on a phone. The kiosk has no widget row: the Weather widget has no place there and the van's tilt lives in the Dial. On a phone (below 800px) it is one card per widget (an empty slot, Weather, tilt, then the battery, fresh and grey water dials), battery first, with the solar readout at the top of the fresh water card. A dial or ring whose record has not fully arrived over MQTT shows "No data yet" or a dash, never a number.
_Avoid_: Home, dashboard (the whole app is the dashboard), overview

**Dial**:
`src/components/start/Dial.tsx`. The kiosk's cockpit row, in the style of Venus OS: two **half-moons** either side of three concentric **rings**. The left half-moon carries two incoming power readings, the right one the outgoing power; the rings are in the middle. The middle of the rings shows the van's tilt while it has a usable reading (both angles present and `status` ok; a sensor error does not count, its retained angles are stale) and the battery readout otherwise. Under the rings a legend lists each ring's level; while the battery readout is in the middle the battery is left out of it, and while the tilt is in the middle it is listed so the battery % stays visible.
_Avoid_: Venus dial (that is the product it imitates, not its name), Cockpit row (the old three-dial layout, now `CockpitDial` in `start/cockpit/`, phone only)

**Half-moon**:
A side dial of the **Dial**: a 100° slice of a large circle (so "(" on the left, ")" on the right) under the cockpit's thin outer ring, cut into one stacked band of three segments per reading, each filling upward from the band's bottom. A reading is a **power source** and a **full band**: the wattage that fills it. A reading whose source has not published shows a dash and an empty band, never 0 W.
The sources are the only power flows on the bus: the solar controller's `power_w`, and the battery's signed `power_w` split by direction (**Charging** is positive, **Load** is negative, **Battery net** is the magnitude). The bus has no shore, alternator, inverter or AC-load topics. Which source feeds each of the three readings, and each full band, is edited at Settings → General → Display → Start page (`useStartPowerSources`, `localStorage`, defaults solar 400 W / charging 1000 W / load 1000 W). A stored value that is missing or malformed falls back to the default for that slot alone.
_Avoid_: Side dial (the phone's dials are also side dials), gauge

**Ring**:
One of the **Dial**'s three concentric 270° bands, outermost first, cut at the cockpit dial's five angles. Each is the battery or one kind of tank (fresh, grey, black, fuel, LPG), chosen at Settings → General → Display → Start page, defaulting to battery, fresh, grey. Colour is severity and nothing else: a tank ring is painted by the same tank alarm zones as its Tanks-page card (via `tankView`); the battery ring is the accent. Two rings may show the same source.
_Avoid_: Dial (a ring has no readout of its own; the readout is shared in the middle)

**Cockpit dial**:
A 270° arc gauge on the phone's Start page (`CockpitDial`, `start/cockpit/`; the kiosk uses the **Dial**): a thin continuous outer ring, a value band and a wide track, the band and the track cut at the same five angles. Colour is severity and nothing else: a tank dial is painted by the same tank alarm zones as its Tanks-page card (via `tankView`), so a dial and its card cannot disagree; the battery dial is the accent. All dials share one geometry, so the arc ends sit a fixed share of the dial's height above its bottom edge, and each dial is offset by that share to put every arc end on one baseline whatever its size.
_Avoid_: Gauge, speedometer, radial gauge (`RadialGauge` was the old Tanks-page component, since removed)

**Solar readout**:
The phone Start page's compact view of the van's `solar` entity (`renewvan/solar/<id>/*`, hub schema `solar.schema.json`, published by `node-venus` from Venus OS): a rising ramp of power bars with the live watts beside it, over the day's yield in kWh. Shown from the first controller whose `power_w` and `battery_voltage_v` have both arrived. The hub publishes no array nameplate, so there is no fixed 100%: the bars scale against the **session peak**, the highest `power_w` seen since the page loaded, held to at least 100 W so a dawn trickle cannot fill them. The reference therefore resets on reload, and the bars read full on the first reading of a session. A controller `charge_state` of `fault` shows the word "Fault" and lights nothing. It is a `meter` for assistive tech, never an `img`, so it is not mistaken for a cockpit dial. The accent colour is the same as the battery dial's; colour is not severity here.
_Avoid_: MPPT, PV (hardware jargon, not the entity name), solar dial (it is not a cockpit dial)
