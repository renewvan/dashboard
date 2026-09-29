# Renewvan Dashboard

The touchscreen kiosk UI mounted in the van. It renders live van state (tanks, batteries, relays) published by the hub over MQTT, and is read at a glance by a possibly-gloved driver.

## Language

**Bus link**:
The kiosk's live MQTT-over-WebSocket connection to the van's broker — what the header's router icon reports. Says nothing about the van's internet reachability.
_Avoid_: Connection status, router status, internet connection

**Uplink**:
The van's internet path as seen by the hub: ethernet (LAN), WiFi, or Tailscale — including its being down. The subject of the internet status icon.
_Avoid_: Internet connection, WAN, network status

**Status button**:
A header icon button that reports a live condition and opens a detail popover on tap; visually transparent, unlike an action button.
_Avoid_: Icon button (ambiguous — could mean an action button)
