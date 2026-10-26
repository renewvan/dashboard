import { useCallback, useMemo } from 'react'
import { settingsCommands } from '@/lib/settings-commands'
import { useStableCallback } from '@/hooks/useStable'

/** The header's sleep/wake command. Its payload is a bare `on`/`off`, not JSON, so it is not one
 * of the settings commands (`lib/settings-commands.ts`). */
const TOPIC_DISPLAY_POWER_SET = 'renewvan/kiosk/display/power/set'

type Publish = (topic: string, payload: string) => void

/**
 * The settings commands and the display sleep/wake handlers, all stable for the life of the
 * component. `publish` is a fresh function every render (it only closes over the bus's stable
 * client ref), so they bind to a forwarder that always calls the latest one.
 */
export function useDisplayCommands(publish: Publish) {
  const stablePublish = useStableCallback(publish)
  const commands = useMemo(() => settingsCommands(stablePublish), [stablePublish])
  const sleepDisplay = useCallback(
    () => stablePublish(TOPIC_DISPLAY_POWER_SET, 'off'),
    [stablePublish],
  )
  const wakeDisplay = useCallback(
    () => stablePublish(TOPIC_DISPLAY_POWER_SET, 'on'),
    [stablePublish],
  )
  return { commands, sleepDisplay, wakeDisplay }
}
