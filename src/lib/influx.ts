import { parseFluxCsv, type FluxPoint } from './influxCsv'

/**
 * Runs a Flux query through the same-origin `/influx` proxy (Caddy in production, the Vite dev
 * server in dev; ADR 0024). The proxy holds the read-only token, so none is sent from here.
 */
export async function queryInflux(flux: string, signal?: AbortSignal): Promise<FluxPoint[]> {
  const response = await fetch('/influx/api/v2/query?org=renewvan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/vnd.flux', Accept: 'application/csv' },
    body: flux,
    signal,
  })
  if (!response.ok) throw new Error(`InfluxDB query failed (${response.status})`)
  // Without the proxy the SPA's index.html (or a login page) answers 200: not an empty history.
  if (!response.headers.get('Content-Type')?.includes('csv')) {
    throw new Error('/influx did not answer with InfluxDB CSV')
  }
  return parseFluxCsv(await response.text())
}
