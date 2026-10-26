import { getEnv } from '@/config/runtimeEnv'
import { hubAddress, type HubAddress } from '@/lib/hubAddress'
import { useContentStable } from './useStable'
import type { HubStatus } from './useRenewvanBus'

/**
 * The hub as the Hub connection block shows it: the Pi's own address from the bus
 * (`renewvan/hub/status`), and how this kiosk reaches the broker from `VITE_MQTT_WS_URL` (see
 * `hubAddress`). The URL is read each render, not at module load, because the runtime value
 * (`window.__ENV__`, written when the container starts) is not there until the page is. A new object
 * comes back only when its content changes, so it can sit in a memoised value.
 */
export function useHubAddress(hubStatus: HubStatus | null): HubAddress | null {
  return useContentStable(hubAddress(hubStatus, getEnv('VITE_MQTT_WS_URL')))
}
