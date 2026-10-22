/** How the kiosk reaches the hub's broker, judged from the address it connected to. */
export type HubRoute = 'local' | 'tailscale' | 'remote'

export interface HubAddress {
  /** The hub's address as shown: the Pi's own published IP, else the broker's host. */
  host: string
  /** How this kiosk reaches the broker; see {@link hubAddress}. */
  route: HubRoute
}

const ROUTE_TEXT: Record<HubRoute, string> = {
  local: 'Local network',
  tailscale: 'Tailscale',
  remote: 'Remote',
}

export function hubRouteText(route: HubRoute): string {
  return ROUTE_TEXT[route]
}

function ipv4Octets(host: string): number[] | null {
  const parts = host.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : Number.NaN))
  return octets.every((o) => o >= 0 && o <= 255) ? octets : null
}

function classifyIpv6(name: string): HubRoute {
  if (name === '::1') return 'local'
  const first = name.split(':')[0]
  if (!/^[0-9a-f]{1,4}$/.test(first)) return 'remote'
  const group = parseInt(first, 16)
  // fc00::/7 covers fc00–fdff; fe80::/10 covers fe80–febf.
  if (group >= 0xfc00 && group <= 0xfdff) return 'local'
  if (group >= 0xfe80 && group <= 0xfebf) return 'local'
  return 'remote'
}

/**
 * Local: loopback, RFC 1918 (10/8, 172.16/12, 192.168/16), link-local (169.254/16), `localhost`
 * and mDNS `.local` names, plus IPv6 loopback, unique-local (fc00::/7) and link-local (fe80::/10).
 * Tailscale: the CGNAT range it hands out (100.64/10) and `.ts.net` names. Anything else is a
 * public address or name, reached over the internet.
 */
export function classifyHost(host: string): HubRoute {
  const name = host.toLowerCase()
  if (name === 'localhost' || name.endsWith('.local')) return 'local'
  if (name.endsWith('.ts.net')) return 'tailscale'
  if (name.includes(':')) return classifyIpv6(name)
  const ip = ipv4Octets(name)
  if (!ip) return 'remote'
  const [a, b] = ip
  if (a === 127 || a === 10) return 'local'
  if (a === 192 && b === 168) return 'local'
  if (a === 172 && b >= 16 && b <= 31) return 'local'
  if (a === 169 && b === 254) return 'local'
  if (a === 100 && b >= 64 && b <= 127) return 'tailscale'
  return 'remote'
}

/** The host part of a broker URL, without scheme, port, path or IPv6 brackets; null if unusable. */
function brokerHost(url: string | undefined): string | null {
  if (!url) return null
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return null
  }
  // `URL.hostname` keeps the brackets of an IPv6 literal; show it bare, as it is written elsewhere.
  host = host.replace(/^\[|\]$/g, '')
  return host === '' ? null : host
}

/**
 * The hub as the Hub connection block shows it: `host` is the Pi's own local-network address, as
 * the hub plugin publishes it (`renewvan/hub/status`), and `route` is how this kiosk reaches the
 * broker, judged from `VITE_MQTT_WS_URL` (e.g. `ws://192.168.1.10:9001`).
 *
 * The two come from different places on purpose. The Pi's address is always its LAN one, so
 * classifying it would say "local network" even for a phone that reached the hub over Tailscale;
 * only the address the client actually connected to says how it got there.
 *
 * With no published address the broker's host stands in for it, so a hub that has not published
 * yet (or runs without the hub plugin) still shows where the kiosk is connected. Null when neither
 * is known.
 */
export function hubAddress(
  status: { ip: string | null } | null,
  brokerUrl: string | undefined,
): HubAddress | null {
  const broker = brokerHost(brokerUrl)
  const host = status?.ip ?? broker
  if (host === null) return null
  return { host, route: classifyHost(broker ?? host) }
}
