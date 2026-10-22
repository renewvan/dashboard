# Renewvan Dashboard

The touchscreen kiosk UI mounted in the van. It renders live van state (tanks, batteries, relays) published by the hub over MQTT, and is read at a glance by a possibly-gloved driver.

## Language

**Bus link**:
The kiosk's live MQTT-over-WebSocket connection to the van's broker — reported as the Hub dot row inside the uplink popover and as the first block of the **Hub page**. Says nothing about the van's internet reachability.
_Avoid_: Connection status, router status, internet connection

**Uplink**:
The van's internet connection as the header's connection status button
(`UplinkStatusButton`) reports it. While the cellular router entity is
feeding (`renewvan/router/<id>/*` + the router **Device**'s health,
`state.devices.router`, hub schema `router.schema.json`) the icon shows five
signal tiers (0–4 bars) from RSRP (≥ -85/-95/-105/-115 dBm). When the router
is silent (no data, data older than 180 s, or device health offline) the van
can still be online over wifi / LAN / Tailscale, so the icon shows
**connected** while the **Bus link** or Tailscale is up, **checking** only
while the Bus link is still connecting, and **offline** only when every path
is down. There is no wifi/LAN signal on the bus: non-cellular reachability is
inferred from the Bus link + Tailscale. The icon carries a small **connection
type** badge: the mobile technology (`LTE`, `5G`, `3G`, `2G`; the schema's `nr`
reads 5G) while the router feeds, or how the kiosk reaches the hub (`LAN`,
`TS`, `WAN`, judged from the broker address in `VITE_MQTT_WS_URL`) while it
does not. Its popover keeps the router and the hub apart: a **Router
connection** block (network, RSRP, data; only while the router feeds), a **Hub
connection** block (the Bus link and the hub's address) and **Remote access**
(Tailscale). How the kiosk reaches the hub (local network, Tailscale or remotely)
is not in the popover: it is the connection-type badge and Settings → Hub's
"Reached over" row. The router carries no IP on the bus (`router.schema.json` has no
such field), so the hub's address is the Pi's own: the hub plugin publishes it
retained to `renewvan/hub/status` (hub `hub-status.schema.json`), read from the
Pi itself, so it is there with or without a router. How the kiosk reaches the
hub is still judged from the broker it connected to (`VITE_MQTT_WS_URL`), never
from the Pi's address, which is always its LAN one: a phone on Tailscale shows
the Pi's LAN address and "Tailscale". Until the Pi has published, the broker's
host stands in for the address.
_Avoid_: Internet connection, WAN, network status, signal strength (alone —
it's the whole connection state, including connected/offline/no-service)

**Map page**:
The `map` page (`MapPage`): a full-bleed MapLibre map of where the hub's GPS fix is, with the van drawn
on it and a readout of fix quality, satellites, speed and heading. It is a live view, not a
navigator: it centres once, so the van moves on a still map and the view re-centres only when the
page remounts. The basemap is **offline**: Protomaps vector tiles read from one regional
`basemap.pmtiles` on the dashboard's own origin (`/maps/`), with fonts and sprites baked into the
image, so no tile request ever leaves the LAN (`docs/adr/0001-self-hosted-pmtiles-basemap.md`, how to
make the file: `docs/offline-map.md`). Outside the file's area, or with no file mounted, the map is an
empty background with the van on it; nothing falls back to the internet.
_Avoid_: GPS page (the old name; the page shows a map, the GPS readings are its readout), OpenStreetMap tiles (the data is OSM's, the tiles are ours)

**Router row**:
The first row of Settings → Connectivity (`ConnectivityView`, page `CellularView`, still
`?view=cellular` so links keep working), named for the **Device** that feeds the router entity:
the one whose retained info `publishes` `router` (`routerDevice`, `lib/routerDevice.ts`),
shown by its model, `RUT-360`, read out of the Device's `product`
(`Teltonika RUT-360 router`), or by the whole product when it names no model. The page shows that
Device (product, status, firmware) above the radio readings. With no router Device and no router
data the row reads **Not installed**, not "Checking…"; router data with no Device behind it
(a driver that publishes no info yet) is still shown, under the plain name `Router`.
_Avoid_: Cellular (the old name; it described the radio, not the hardware or the driver)

**Hub page**:
Settings → Connectivity → Hub (`HubView`, `?view=hub`), the hub as this kiosk sees it, in four titled blocks.
**Bus link**: the live status, the broker's endpoint (`host:port`) and protocol (`WebSocket`, or
`WebSocket (TLS)` for `wss:`), whether a **Login** is configured, and how the kiosk **reaches** the broker
(local network, Tailscale or remote). **Hub**: the Pi's own address and hostname, from the hub plugin's
`renewvan/hub/status`. **Devices**: how many **Device**s are on the bus and what they last said
(`3 online · 1 offline`), counting only Devices, never an entity type no Device claims. **Dashboard**:
the address this page was served from. A value not yet known reads as a dash, never a guess. The broker
is shown only through `brokerLink`, built from the URL's host and scheme and nothing else, and its Login
is only ever `Required` or `None`: the username, password and any `user:pass@` in `VITE_MQTT_WS_URL` never
reach the page.
_Avoid_: Broker page, Hub status (that is the plugin's topic, one block of this page)

**Tailscale page**:
Settings → Connectivity → Tailscale (`TailscaleView`, `?view=tailscale`): the Status row (its wording is
the row summary on the Connectivity list), then the **Node** (daemon `Connected`, `Needs login` or `Not
installed`; address; hostname; peers online) and **Reachable at**, the dashboard (`http://<ip>`) and the
broker (`<ip>:1883`) over the tailnet, as the Tailscale plugin documents them. The plugin publishes only
`false`, `null` and `0` while signed out, so those rows read as dashes and Reachable at offers no link
rather than a dead one.
_Avoid_: VPN page

**Status button**:
A header icon button that reports a live condition and opens a detail popover on tap; visually transparent, unlike an action button.

**Alerts toggle**:
The kiosk-local Settings → General → Alerts switch (`useAlertsEnabled`, `localStorage`, default on) that shows or hides alert toasts. Muting only suppresses the toast: the alert is still tracked and recorded in the Alerts page's history, and an alert still open when un-muted is shown again. It does not stop the hub from raising alarms.
_Avoid_: Disable alerts, alarm off (alarms and history are unaffected)
_Avoid_: Icon button (ambiguous — could mean an action button)

**Demo mode**:
The Settings → General → System → Demo mode switch (like **Navigation style** it is a toggle inline in General and opens no page of its own): one switch **shared by every client on the bus**, not a per-client preference. It publishes `renewvan/demo/enabled/set` (a JSON boolean, not retained) and the hub's `driver-demo`, which always runs and is idle while off, answers by publishing the retained state `renewvan/demo/enabled` and, while it is `true`, the simulated van under `renewvan/demo/<entity>/<id>/<property>` (see hub `docs/demo-mode.md`). Every dashboard follows that retained flag, so toggling in one client shows the demo in all of them, and it survives a reload or a `driver-demo` restart. The switch never changes the view itself: it only asks, and the view changes when the bus reports it did. `useRenewvanBus` subscribes once to `renewvan/#` (the `renewvan/demo/` namespace sits inside it, so a second wildcard would deliver every demo message twice) and keeps the real and demo entities apart, so switching is instant (no reconnect) and real and simulated values cannot mix; the kiosk and tailscale host plugins stay on the real `renewvan/` root because no demo device simulates them, and demo state is read-only (only kiosk commands and the switch itself are published while it is on). Off by default: a real van never silently shows fake data, and a header "Demo" pill is shown while it is on. With no `driver-demo` running the flag is never answered, so the switch does nothing. **Nothing simulated is ever persisted**: demo tank alarms still raise toasts (the alert UI can be developed against them) but are never written to the Alerts page history, and switching the mode neither resolves nor duplicates a real alert's history row. Real devices and the logger keep running throughout, so the real van's history has no gap.
_Avoid_: Simulation mode, test mode, demo data (the mode is the toggle; the data is the simulated van)

**Navigation style**:
The kiosk-local choice, a toggle inline in Settings → General → Display & Appearance (Appearance group, labelled Navigation style; it opens no page of its own), of how Settings opens its deeper views: **subpage** (the view replaces the page, with a breadcrumb trail) or **drawer** (the view slides in from the right over the page, behind a translucent blurred backdrop). Persisted in `localStorage`, default subpage (an earlier stored value `sheet` still reads as drawer). On a phone (below 800px) Settings always uses subpage, whatever is stored: the toggle shows Subpages selected but disabled, and the stored choice is kept for the kiosk. Says nothing about the app's primary navigation (see **Navbar position**).
_Avoid_: Navigation (alone — the sidebar is also navigation), layout, view mode, sheet

**Navbar position**:
The kiosk-local choice, a toggle inline in Settings → General → Display & Appearance (Appearance group, labelled Navigation position, which opens no page of its own; the term stays Navbar position), of where the app's primary navigation lives: **left** (a closed icon-only rail spanning the full height of the app, beside the pages; the header clears it, so the logo sits to its right while it is up) or **bottom** (a bar under the pages). On the kiosk the navbar is a translucent, blurred **overlay** that never pushes the pages: it floats over them, and a page that must not run under it (today the Start page) pads itself by the edge it covers (56px left, 57px bottom), which the app shell publishes as `--navbar-inset-left` / `--navbar-inset-bottom`. The pages that fill their pane (e.g. Tanks) ignore it, so the translucent navbar floats over their bottom edge. Either one **auto-hides**: it slides away (the rail to the left, the bar downwards) after about 4s without a touch or key, the inset drops to 0 so the Start page stretches into the freed space, and a touch anywhere on the screen brings it back and the Start page makes room again; a pointer merely moving does not. A pin button on the navbar (under the last tab on the rail, at the end of the bar) turns auto-hiding off: the navbar stays up, the pages keep the room they made for it, and the header and pages stop animating their padding (nothing moves, so nothing needs to glide); that pin resets on reload. Persisted in `localStorage` (`useNavbarPosition`), default left. The header spans the full width in both, always carries the full lockup, and has no background on the kiosk; its padding is the same 16px as the pages'. On a phone (below 800px) the navigation is always a bottom bar that never hides and stays in the layout (solid surface background, pages end above it), with the header on a surface background, whatever is stored: the toggle shows Bottom selected but disabled, and the stored choice is kept for the kiosk.
_Avoid_: Sidebar position, nav style (that is Navigation style, which is about Settings' own views)

**Tank alarm zones** (the tank gauge fill and badge):
Three severity zones—based on the per-tank `alarm_direction`/`alarm_threshold_pct`/`alarm_restore_pct` wire fields (hub schema v0.5, published retained/static by driver-tank)—shown by the gauge fill and the badge, both painted from one severity key (`lib/tank-alarm.ts`) so they never disagree:

- **Normal**: Safe level; for low-direction tanks, at/above restore (e.g. fresh ≥48%); for high-direction tanks, at/below restore (e.g. grey ≤80%). The fill is the accent, the same for every fluid; colour means severity and nothing else.
- **Caution**: Open band between threshold and restore; requires attention but not yet an alarm. The fill is `--warning`.
- **Danger**: At/past the alarm threshold (e.g. fresh ≤27%, grey ≥90%), or a sensor fault, or the hub's committed `alarm_state: alarm` (covers delay and hysteresis). The fill is `--danger`. Direct visual match: tank is draining to empty or filling to full.

The `alarm_state` wire field publishes only committed transitions (after hysteresis + delay); the dashboard reads the threshold/restore band straight off the wire to color the danger/caution zones without delay, so a driver sees the full severity story even before the hub's own alert fires. See hub's `docs/adr/0004-tank-alarm-config-published-on-wire.md` for why these are wire fields rather than a dashboard-side hardcoded mirror.
_Avoid_: Alarm state, alert state, warning state (use alarm/caution/normal zones for the colors)

**Device**:
Anything that publishes onto the bus, identified by its retained `renewvan/<device>/info` and `renewvan/<device>/health` topics (hub ADR 0011, `device-info.schema.json`); the **Board** is the hardware it runs on. The bus hook accumulates them per root into `state.devices` (an empty payload clears; an info that is not a JSON object with string `device`, `product`, `source` and `version`, and `publishes` a list of strings if present, reads as no info). `demo` is a reserved key, never a Device, and the host plugins (kiosk, Tailscale) are not Devices. A Device is named for its source, not an entity type (`venus` publishes batteries, solar and chargers), and is joined to entities only through its `publishes` list: two Devices publishing the same type both show the same instances.
_Avoid_: Node (superseded — renamed to avoid a third-party trademark, see hub `docs/adr/0014-node-to-device-rename.md`), Driver (the old name; nothing publishes `renewvan/<domain>/driver/status` any more and the dashboard no longer special-cases it)

**Device row**:
One line of Settings › Devices (`deviceRows`, `lib/devices.ts`): a Device, or a **fallback row** for an entity type that no Device claims (key `domain:<entity>`, the old label such as Tanks or GPS, version `Unknown`, health unknown). A row reads `<version> · <N entities>` beside a status dot: green online, grey offline or health unknown, amber online with no info. A Device with no info has no `publishes`, so its entity count is unknown and its row shows the version alone; its entities appear in the fallback row, so an un-migrated device shows twice. The same wording feeds the Firmware page: `v0.8.0`, `dev`, `Unknown`, `offline, last seen v0.1.0`.
_Avoid_: Entity row, device summary (the old per-entity-type summary, removed)

**Device page**:
The Settings view for one Device or fallback row (`?page=settings&view=device&device=<key>`), a real breadcrumb level `Settings › Devices › <name>` that works in both **Navigation style**s. `device` is valid only while it names a currently reported Device or a fallback key, otherwise the page falls back to the Devices list. It shows the Device's Status, a Device row that opens the **Device info page**, and the entities it publishes. A Device offline with info greys the whole page to 60% opacity. Tanks and Temperature stay at their own views under Devices and open from the page's Publishes rows.
_Avoid_: Node page, Node settings

**Device info page**:
The Venus-style Settings subpage behind a **Device page**'s Device row (`?page=settings&view=device-info&device=<key>`, titled Device): the **Device info** of that Device. Rows are always Product, Source, Firmware version, Board serial, Manufacturer, Homepage, with `—` for a missing value; Manufacturer reads `renewvan` only when info exists without one, and the Board serial is shown in full here and nowhere else. A Device with no info shows a muted note.
_Avoid_: Device details page

**Tank settings**:
The per-tank page at Settings › Devices › Tanks › _tank_ (`?page=settings&view=tank&tank=<id>`), opened by the Configure button on a tank's card or row (and, from a **Device page**, by its Tanks row). It is meant to mirror the device's own config (the `[tank.*]` parameters of driver-tank, as in [dbus-ads1115's configuration parameters](https://github.com/alexsanzder/dbus-ads1115#configuration-parameters)). Today it shows only **Enabled**, read-only: `enabled` is a driver-tank `config.ini` value read at startup, with no wire field or `/set` topic to change it, and a disabled tank stops publishing and so would drop out of the list. Each setting becomes editable once the hub schema and driver-tank define a command topic for it.
_Avoid_: Tank config (the device's `config.ini` is the source; this page is the dashboard's view of it)

**Start page**:
The first page (`?page=start`, `src/components/start/`): the **Dial** on the kiosk, edge to edge, or one card per widget on a phone. The kiosk has no widget row: the Weather widget (forecast) has no place there and the van's tilt lives in the Dial; the van's own indoor and outdoor probe readings float above the Dial's half-moons instead (see **Dial**). On a phone (below 800px) it is one card per widget (an empty slot, Weather, tilt, then the battery, fresh and grey water dials), battery first, with the solar readout at the top of the fresh water card. A dial or ring whose record has not fully arrived over MQTT shows "No data yet" or a dash, never a number.
_Avoid_: Home, dashboard (the whole app is the dashboard), overview

**Power page**:
The `power` page (`?page=power`, `src/components/power/`): where the van's power comes from, where it goes, and what the battery is doing, drawn as one **power snapshot** (`flowModel.ts`) so every layout shows identical numbers. In Tiles and Orbs the sources (solar, alternator, shore charger) sit on the left, the battery in the middle and the loads on the right; in the van layouts the van is the middle. It is the full picture; the **Dial** on the **Start page** is the cockpit summary of the same entities. Until the battery has published its core measurements it says "No data yet" rather than drawing numbers it does not have.
_Avoid_: Energy page, overview

**Power layout**:
The kiosk-local choice, in Settings → General → Display & Appearance → Power page (`usePowerLayout`, `localStorage`, default **Tiles**), of how the **Power page** draws the snapshot: **Tiles** (boxed readings) or **Orbs** (round nodes on a diagram), both joined by the same links (`PowerLinks`): grey rails with blue dashes crawling in the direction of power, the sources merging into one shared run into the battery whose speed follows their summed watts. Both fill the page, so they grow and shrink as the bottom **Navbar position** slides, and both fill the battery from the bottom by its charge; only while it charges do they send a soft glow rising up through the fill (and glow around the battery), and it is dark when the battery discharges or idles. Flow speed and pulse rate follow the watts. Only the picture differs between layouts.

**Van tiles** and **Van orbs** are the same two styles with the van, not the battery, as the hub (`VanTilesLayout`, `VanOrbsLayout`, sharing `VanDiagram`). The van is drawn from the tilt widget's side outline and its charge fills the whole silhouette from the wheels up; a flat bar under it (the Tanks page's level bar, with ticks at 25, 50 and 75%) repeats the charge, with the battery's signed power and what it is doing ("Charging", "Discharging", "Idle") and the time to empty beside it. Each source and the loads is wired to its own port on the van, marked by a half-dome on the outline: solar to the roof, alternator and shore charger to the rear, the loads leaving through the nose. Unlike Tiles and Orbs, the van glows, and its fill pulses, whenever power is coming in from a source, even while the battery as a whole is discharging.
_Avoid_: Power style, power view, variant

**Loads**:
On the **Power page**, **derived, never measured**: the hub publishes no load entity, so Loads is everything the sources put in minus what the battery absorbed (the battery's signed `power_w`, positive while charging), clamped at zero. It splits into **AC loads** (through an inverter/charger) and **DC loads** (straight off the battery) only while an inverter reading is supplied to the snapshot; driver-venus maps none of Venus's `vebus` or `system/0/Ac|Dc` paths yet, so on today's bus the page always shows one Loads node and the inverter and the AC/DC split are unreachable until the hub gains those entities.
_Avoid_: Consumption, house load, AC/DC loads (alone: they only exist alongside an inverter)

**Dial**:
`src/components/start/Dial.tsx`. The kiosk's cockpit row, in the style of Venus OS: two **half-moons** either side of three concentric **rings**. The left half-moon carries the solar reading and, while an alternator or shore charger is present, a charging reading under it; the right one carries the outgoing power; the rings are in the middle. The middle of the rings shows the van's tilt while it has a usable reading (both angles present and `status` ok; a sensor error does not count, its retained angles are stale) and the battery readout otherwise. Under the rings a legend lists each ring's level; while the battery readout is in the middle the battery is left out of it, and while the tilt is in the middle it is listed so the battery % stays visible. Above the half-moons float the van's temperatures (`DialTemperature`): the `outdoor` probe over the left one, the `indoor` probe over the right (`lib/temperature.ts`), each in its own configured unit and name. They are overlays and take no room, so they never move the half-moons. A probe that is not `ok` or has not published shows `--°`, never its retained value, and, unlike the phone's Weather widget, the outdoor reading has no forecast fallback.
_Avoid_: Venus dial (that is the product it imitates, not its name), Cockpit row (the old three-dial layout, now `CockpitDial` in `start/cockpit/`, phone only)

**Half-moon**:
A side dial of the **Dial**: a 100° slice of a large circle (so "(" on the left, ")" on the right) under the cockpit's thin outer ring, cut into one stacked band of three segments per reading, each filling upward from the band's bottom. A reading is a **power source** and a **full band**: the wattage that fills it. A reading whose source has not published shows a dash and an empty band, never 0 W.
The solar and load readings take a **power source**: the solar controller's `power_w`, or the battery's signed `power_w` split by direction (**Load** is negative, **Charging** positive, **Battery net** the magnitude). The left-bottom reading is not chosen: it follows the van's non-solar charger (the hub's `charger` entity, `renewvan/charger/<id>/*`) by its `source`: **Alternator** (`alternator`, Engine icon) or **Shore** (`ac`, a Victron Blue Smart IP22, PlugZap icon). With one charger above the idle floor (5 W) it is that charger, named; with both above it, their sum as **Chargers** (Zap icon), so neither is hidden behind the other; with neither (both idle, or no watts published) the alternator is named, so an alternator idling at 0 A never hides a charging shore charger and the name does not change in a quiet van. A charger with no watts published counts as inactive and adds nothing to the sum. The reading is absent (the left half-moon is just solar) while neither is, or while a charger has not yet published its `source`. driver-venus publishes no charger `power_w`, so the watts are voltage × current when `power_w` is missing (`lib/charging.ts`). There are no inverter or AC-load topics. The solar and load sources, and all three full bands, are edited at Settings → General → Display & Appearance → Start page (`useStartPowerSources`, `localStorage`, defaults solar 400 W / charger 1000 W / load 1000 W). A stored value that is missing or malformed falls back to the default for that slot alone; an older save's charging `source` is ignored and only its scale kept.
_Avoid_: Side dial (the phone's dials are also side dials), gauge

**Ring**:
One of the **Dial**'s three concentric 270° bands, outermost first, cut at the cockpit dial's five angles. Each is the battery or one kind of tank (fresh, grey, black, fuel, LPG), chosen at Settings → General → Display & Appearance → Start page, defaulting to battery, fresh, grey. Colour is severity and nothing else, and there are only three: blue is fine, amber-500 (`#f59e0b`, not the theme's paler `--warning`) is an alert, and the theme's red (`--danger`) is wrong or bad. A tank ring follows the same tank alarm zones as its Tanks-page card (via `tankView`) and is also red at the wrong extreme with or without an alarm configured: empty for fresh water, fuel and LPG, full for grey and black water, a fault always. The battery ring is blue, amber from 40% state of charge down and red from 20% down (the Power page already paints it red from 20%). The colours live in `start/cockpit/dialView.ts`. The battery ring also carries a soft white band (`BatteryPulse`) that always travels along its fill, from where the fill starts to where it ends, at the Power page battery's pace and pause, whatever the battery is doing (not under reduced motion). The two outer ends of each ring (its start and its open end, not the cuts between segments) are rounded by the theme's `--radius` (`src/global.css`, 0.25rem = 4px, as `cornerRadius` in `arcs.ts`), and so is the end of the fill wherever the level stops, so they are as round as a card or a button (a fill shorter than its two corners is drawn square). Two rings may show the same source.
_Avoid_: Dial (a ring has no readout of its own; the readout is shared in the middle)

**Cockpit dial**:
A 270° arc gauge on the phone's Start page (`CockpitDial`, `start/cockpit/`; the kiosk uses the **Dial**): a thin continuous outer ring, a value band and a wide track, the band and the track cut at the same five angles. Colour is the **Ring**'s: blue, amber-500 or red by severity and nothing else, so a tank dial follows the same tank alarm zones as its Tanks-page card (via `tankView`) and they cannot disagree; the battery dial is coloured by its charge as the Ring is, and carries the same travelling band as the **Ring**. All dials share one geometry, so the arc ends sit a fixed share of the dial's height above its bottom edge, and each dial is offset by that share to put every arc end on one baseline whatever its size.
_Avoid_: Gauge, speedometer, radial gauge (`RadialGauge` was the old Tanks-page component, since removed)

**Solar readout**:
The phone Start page's compact view of the van's `solar` entity (`renewvan/solar/<id>/*`, hub schema `solar.schema.json`, published by `driver-venus` from Venus OS): a rising ramp of power bars with the live watts beside it, over the day's yield in kWh. Shown from the first controller whose `power_w` and `battery_voltage_v` have both arrived. The hub publishes no array nameplate, so there is no fixed 100%: the bars scale against the **session peak**, the highest `power_w` seen since the page loaded, held to at least 100 W so a dawn trickle cannot fill them. The reference therefore resets on reload, and the bars read full on the first reading of a session. A controller `charge_state` of `fault` shows the word "Fault" and lights nothing. It is a `meter` for assistive tech, never an `img`, so it is not mistaken for a cockpit dial. The accent colour is the same as the battery dial's; colour is not severity here.
_Avoid_: MPPT, PV (hardware jargon, not the entity name), solar dial (it is not a cockpit dial)
