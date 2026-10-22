/** The broker's connection as the Hub page may show it. Nothing here can carry a secret. */
export interface BrokerLink {
  /** `host` or `host:port` (IPv6 bracketed, as a person writes it); no scheme, path or credentials. */
  endpoint: string
  /** `WebSocket` for `ws:`, `WebSocket (TLS)` for `wss:`; the raw scheme for anything else. */
  protocol: string
  /** Whether the broker asked this kiosk to log in (a username or password is configured). */
  authenticated: boolean
}

const PROTOCOL_TEXT: Record<string, string> = {
  'ws:': 'WebSocket',
  'wss:': 'WebSocket (TLS)',
}

/**
 * The display-safe parts of the kiosk's broker connection, from `VITE_MQTT_WS_URL` and whether the
 * kiosk has credentials. Built from `URL.host` and `URL.protocol` only, never `href`, `username`,
 * `password` or the path: a broker URL may embed `user:pass@`, and this page is read at a glance by
 * anyone in the van, so a secret must not be one string-concatenation away. `authenticated` is a
 * boolean for the same reason: it says a login exists, never what it is.
 *
 * Null while no URL is configured or it does not parse.
 */
export function brokerLink(
  url: string | undefined,
  credentials: { username?: string; password?: string },
): BrokerLink | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.host === '') return null
  return {
    // `host` is `hostname[:port]` and keeps an IPv6 literal's brackets; the default port is dropped
    // by `URL` itself, which is what a person expects to read.
    endpoint: parsed.host,
    protocol: PROTOCOL_TEXT[parsed.protocol] ?? parsed.protocol.replace(/:$/, ''),
    authenticated:
      Boolean(credentials.username) ||
      Boolean(credentials.password) ||
      parsed.username !== '' ||
      parsed.password !== '',
  }
}
