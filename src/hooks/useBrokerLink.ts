import { getEnv } from '@/config/runtimeEnv'
import { useContentStable } from './useStable'
import { brokerLink, type BrokerLink } from '@/lib/brokerLink'

/**
 * The display-safe parts of the kiosk's broker connection (`brokerLink`). Read each render, not at
 * module load, for the same reason as `useHubAddress`: the runtime value (`window.__ENV__`) is not
 * there until the page is. The credentials are read only to say whether a login exists; the link
 * that comes back carries neither. A new object comes back only when its content changes, so it can
 * sit in a memoised value.
 */
export function useBrokerLink(): BrokerLink | null {
  return useContentStable(
    brokerLink(getEnv('VITE_MQTT_WS_URL'), {
      username: getEnv('VITE_MQTT_USERNAME'),
      password: getEnv('VITE_MQTT_PASSWORD'),
    }),
  )
}
