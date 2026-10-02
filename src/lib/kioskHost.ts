/**
 * True only when this page is being viewed on the physical kiosk display
 * itself, never on a remote device (phone, laptop) pointed at the same
 * dashboard. The hub's deploy script (`hub/bin/deploy.sh`) launches the
 * kiosk's Chromium pinned to `http://localhost`; every other viewer reaches
 * the dashboard over a LAN/Tailscale hostname or IP. Hostname is therefore
 * a reliable, zero-config signal — no new MQTT topic or schema needed to
 * tell "the van's own screen" apart from "someone looking in remotely".
 *
 * Takes `hostname` as a parameter (defaulting to the real
 * `window.location.hostname`) so call sites get real behavior for free
 * while tests can exercise both branches without mocking `window.location`.
 */
export function isLocalKiosk(hostname: string = window.location.hostname): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}
