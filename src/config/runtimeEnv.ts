// Runtime-configurable env for the dashboard's static build. Vite's
// `import.meta.env.VITE_*` is inlined at `npm run build` time (a step
// already completed when this image was published), so it can't vary
// per deployment -- the same published image must work against whatever
// renewvan bus a given Pi/host is pointed at. `docker/generate-env-js.sh`
// (run as an nginx `docker-entrypoint.d` script, see Dockerfile) writes
// `window.__ENV__` from the *container's* environment at startup; this
// module prefers that when present and falls back to the build-time
// value otherwise (so `npm run dev` / `vite build` previews still work
// without a running container).

declare global {
  interface Window {
    __ENV__?: Record<string, string | undefined>
  }
}

/**
 * `VITE_MQTT_WS_URL` may be a path (`/mqtt`) instead of a full URL: it then means "this page's own
 * origin", with the scheme swapped to `ws:`/`wss:`. The container's nginx proxies that path to the
 * broker, so a browser needs to reach only the port it loaded the page from -- not `:9001`, which
 * a WireGuard/Tailscale route or a firewall may not carry. Every consumer parses the result with
 * `new URL`, so it is resolved here, once, into an absolute `ws(s)://host/path`.
 */
export function resolveBrokerUrl(
  value: string | undefined,
  location: Pick<Location, 'protocol' | 'host'>,
): string | undefined {
  if (!value || !value.startsWith('/')) return value
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${scheme}//${location.host}${value}`
}

export function getEnv(key: string): string | undefined {
  const runtimeValue = typeof window !== 'undefined' ? window.__ENV__?.[key] : undefined
  const value = runtimeValue
    ? runtimeValue
    : (import.meta.env as Record<string, string | undefined>)[key]
  if (key !== 'VITE_MQTT_WS_URL' || typeof window === 'undefined') return value
  return resolveBrokerUrl(value, window.location)
}
