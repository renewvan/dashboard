/**
 * True only when this page is being viewed on the physical kiosk display
 * itself, never on a remote device (phone, laptop, dev machine) pointed at
 * the same dashboard.
 *
 * NOT hostname-based: `window.location.hostname === 'localhost'` was tried
 * first and is wrong — "localhost" means "this device" for ANY machine,
 * including a developer's own laptop running the dashboard locally (dev
 * server, or an SSH tunnel to the Pi forwarded onto localhost). It doesn't
 * identify the Raspberry Pi specifically.
 *
 * Instead, the Pi's own Chromium instance is launched with an explicit
 * `?kioskHost=1` marker on the URL — see `hub/bin/deploy.sh` (relaunch
 * after every deploy) and `hub/plugins/kiosk/labwc-autostart` (boot-time
 * launch). No other viewer's URL carries it, by construction: it's not
 * derived from anything about the viewing device, only from which exact
 * URL was used to load the page.
 *
 * Takes `search` as a parameter (defaulting to the real
 * `window.location.search`) so call sites get real behavior for free while
 * tests can exercise both branches without mocking `window.location`.
 */
export function isLocalKiosk(search: string = window.location.search): boolean {
  return new URLSearchParams(search).get('kioskHost') === '1'
}
