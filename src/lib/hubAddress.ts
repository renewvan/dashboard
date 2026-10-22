/** How the kiosk reaches the hub's broker, judged from the address it connected to. */
export type HubRoute = 'local' | 'tailscale' | 'remote'

export interface HubAddress {
  /** Hostname or IP of the broker, without scheme, port or path. */
  host: string
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

/**
 * The broker the kiosk connects to, from its `VITE_MQTT_WS_URL` (e.g. `ws://192.168.1.10:9001`):
 * the hub's address as the kiosk sees it, which is the only hub address a browser can know. Null
 * while no URL is configured or it does not parse.
 */
export function hubAddress(url: string | undefined): HubAddress | null {
  if (!url) return null
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return null
  }
  if (host === '') return null
  // `URL.hostname` keeps the brackets of an IPv6 literal; show it bare, as it is written elsewhere.
  host = host.replace(/^\[|\]$/g, '')
  return { host, route: classifyHost(host) }
}
