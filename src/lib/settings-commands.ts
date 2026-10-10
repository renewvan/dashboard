import type { AutoSleepTimeoutMinutes } from '@/hooks/useRenewvanBus'

/**
 * Settings commands: the one place that owns the `/set` topics and the
 * `JSON.stringify` encoding. Topics are hyphenated like the bus hook's
 * `TOPIC_*` constants (which are module-private, so the strings are
 * re-declared here); a command topic is the state topic plus `/set`.
 *
 * Every payload is `JSON.stringify(value)`. The header's sleep/wake buttons
 * publish bare `'on'`/`'off'` to a different topic and are deliberately not here.
 */
const TOPIC_BRIGHTNESS_SET = 'renewvan/kiosk/display/brightness/set'
const TOPIC_AUTO_SLEEP_ENABLED_SET = 'renewvan/kiosk/display/auto-sleep-enabled/set'
const TOPIC_AUTO_SLEEP_TIMEOUT_SET = 'renewvan/kiosk/display/auto-sleep-timeout-minutes/set'

export type Publish = (topic: string, payload: string) => void

export interface SettingsCommands {
  setBrightness: (value: number) => void
  setAutoSleepEnabled: (value: boolean) => void
  setAutoSleepTimeoutMinutes: (value: AutoSleepTimeoutMinutes) => void
}

/** Binds the settings commands to `publish`. Pure: build once, share everywhere. */
export function settingsCommands(publish: Publish): SettingsCommands {
  return {
    setBrightness: (value) => publish(TOPIC_BRIGHTNESS_SET, JSON.stringify(value)),
    setAutoSleepEnabled: (value) => publish(TOPIC_AUTO_SLEEP_ENABLED_SET, JSON.stringify(value)),
    setAutoSleepTimeoutMinutes: (value) =>
      publish(TOPIC_AUTO_SLEEP_TIMEOUT_SET, JSON.stringify(value)),
  }
}
