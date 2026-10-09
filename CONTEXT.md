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

**Tank alarm zones** (TankCard liquid color):
Three severity bands—based on the per-tank `alarm_direction`/`alarm_threshold_pct`/`alarm_restore_pct` wire fields (hub schema v0.5, published retained/static by node-tank)—visualized by the liquid fill color:

- **Blue (normal)**: Safe level; for low-direction tanks, at/above restore (e.g. fresh ≥48%); for high-direction tanks, at/below restore (e.g. grey ≤80%).
- **Amber (caution)**: Open band between threshold and restore; requires attention but not yet an alarm.
- **Red (danger)**: At/past the alarm threshold (e.g. fresh ≤27%, grey ≥90%), or a sensor fault, or the hub's committed `alarm_state: alarm` (covers delay and hysteresis). Direct visual match: tank is draining to empty or filling to full.

The `alarm_state` wire field publishes only committed transitions (after hysteresis + delay); the dashboard reads the threshold/restore band straight off the wire to color the danger/caution zones without delay, so a driver sees the full severity story even before the hub's own alert fires. See hub's `docs/adr/0004-tank-alarm-config-published-on-wire.md` for why these are wire fields rather than a dashboard-side hardcoded mirror.
_Avoid_: Alarm state, alert state, warning state (use alarm/caution/normal zones for the colors)
