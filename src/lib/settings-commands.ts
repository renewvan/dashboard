import type { AutoSleepTimeoutMinutes } from '@/hooks/useRenewvanBus'
import type { TemperatureUnit } from '@/types'

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

const TOPIC_PRIMARY_BATTERY_SET = 'renewvan/hub/primary-battery/set'

const temperatureSetTopic = (id: string, field: 'name' | 'unit') =>
  `renewvan/temperature/${id}/${field}/set`

const relaySetTopic = (id: string, field: 'set' | 'name/set') => `renewvan/relay/${id}/${field}`

export type Publish = (topic: string, payload: string) => void

export interface SettingsCommands {
  setBrightness: (value: number) => void
  setAutoSleepEnabled: (value: boolean) => void
  setAutoSleepTimeoutMinutes: (value: AutoSleepTimeoutMinutes) => void
  setTemperatureName: (id: string, name: string) => void
  setTemperatureUnit: (id: string, unit: TemperatureUnit) => void
  /** Sends the TARGET state, never a toggle: a toggle is not idempotent (hub ADR 0013). */
  setRelay: (id: string, on: boolean) => void
  setRelayName: (id: string, name: string) => void
  /** `auto` or a battery instance id; the hub plugin persists it and republishes the retained state. */
  setPrimaryBattery: (value: string) => void
}

/** Binds the settings commands to `publish`. Pure: build once, share everywhere. */
export function settingsCommands(publish: Publish): SettingsCommands {
  return {
    setBrightness: (value) => publish(TOPIC_BRIGHTNESS_SET, JSON.stringify(value)),
    setAutoSleepEnabled: (value) => publish(TOPIC_AUTO_SLEEP_ENABLED_SET, JSON.stringify(value)),
    setAutoSleepTimeoutMinutes: (value) =>
      publish(TOPIC_AUTO_SLEEP_TIMEOUT_SET, JSON.stringify(value)),
    // A name is a JSON string, so it goes out quoted: `"Galley roof"`.
    setTemperatureName: (id, name) =>
      publish(temperatureSetTopic(id, 'name'), JSON.stringify(name)),
    setTemperatureUnit: (id, unit) =>
      publish(temperatureSetTopic(id, 'unit'), JSON.stringify(unit)),
    setRelay: (id, on) => publish(relaySetTopic(id, 'set'), JSON.stringify(on)),
    setRelayName: (id, name) => publish(relaySetTopic(id, 'name/set'), JSON.stringify(name)),
    setPrimaryBattery: (value) => publish(TOPIC_PRIMARY_BATTERY_SET, JSON.stringify(value)),
  }
}
