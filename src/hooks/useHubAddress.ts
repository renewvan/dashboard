import { getEnv } from '@/config/runtimeEnv'
import { hubAddress, type HubAddress } from '@/lib/hubAddress'

/**
 * The broker the kiosk is pointed at, as `hubAddress` reads it from `VITE_MQTT_WS_URL`: the hub's
 * address as seen from this kiosk. Read each render, not at module load, because the runtime value
 * (`window.__ENV__`, written when the container starts) is not there until the page is.
 */
export function useHubAddress(): HubAddress | null {
  return hubAddress(getEnv('VITE_MQTT_WS_URL'))
}
