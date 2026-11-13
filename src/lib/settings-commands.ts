import type { AutoSleepTimeoutMinutes } from '@/hooks/useRenewvanBus'
import { iconKey, type IconEntity } from '@/lib/entityIcons'
import type { HeaterMode, TemperatureUnit } from '@/types'

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

const TOPIC_ICONS_SET = 'renewvan/hub/icons/set'
const TOPIC_RELAY_GROUPS_SET = 'renewvan/hub/relay-groups/set'
const TOPIC_RELAY_GROUP_LIST_SET = 'renewvan/hub/relay-group-list/set'
const TOPIC_RELAY_ORDER_SET = 'renewvan/hub/relay-order/set'

const tiltLevelTopic = (id: string) => `renewvan/tilt/${id}/level_zero/set`

const heaterSetTopic = (
  id: string,
  field:
    | 'set'
    | 'mode/set'
    | 'setpoint_c/set'
    | 'power_level/set'
    | 'ventilating/set'
    | 'thermostat/set'
    | 'commands_enabled/set',
) => `renewvan/heater/${id}/${field}`
const relaySetTopic = (id: string, field: 'set' | 'name/set') => `renewvan/relay/${id}/${field}`

export type Publish = (topic: string, payload: string) => void

export interface SettingsCommands {
  setBrightness: (value: number) => void
  setAutoSleepEnabled: (value: boolean) => void
  setAutoSleepTimeoutMinutes: (value: AutoSleepTimeoutMinutes) => void
  setTemperatureName: (id: string, name: string) => void
  setTemperatureUnit: (id: string, unit: TemperatureUnit) => void
  /**
   * Picks the icon every client draws an instance with: a lucide component name from
   * `lib/entityIcons.ts`. The hub plugin owns the shared map (hub ADR 0023).
   */
  setEntityIcon: (entity: IconEntity, id: string, icon: string) => void
  /** Sends the TARGET state, never a toggle: a toggle is not idempotent (hub ADR 0013). */
  setRelay: (id: string, on: boolean) => void
  setRelayName: (id: string, name: string) => void
  /**
   * Files a relay channel under a group (Lights, Appliances, USB, ...), or `null` to take it back
   * to Unassigned. The hub plugin owns the shared map (hub ADR 0028).
   */
  setRelayGroup: (id: string, group: string | null) => void
  /**
   * Replaces the list of groups on offer: their names, in display order. The hub plugin owns the
   * shared list and leaves the assignments alone, so a caller that renames or removes a group moves
   * or clears its relays first (`relayGroups.ts`).
   */
  setRelayGroupList: (names: readonly string[]) => void
  /**
   * Replaces the shared order of relay channels inside a group card with these relay ids, first to
   * last. The hub plugin owns it (hub ADR 0028); `reorderedRelayOrder` builds the array.
   */
  setRelayOrder: (ids: readonly string[]) => void
  /** Starts (`true`) or stops (`false`) the heater: a target, never a toggle (hub ADR 0021). */
  setHeaterRunning: (id: string, run: boolean) => void
  setHeaterMode: (id: string, mode: HeaterMode) => void
  /**
   * Starts (`true`) fan-only ventilation from off, or stops (`false`) the heater. Ventilation is an
   * action, not a `mode` value (hub ADR 0021).
   */
  setHeaterVentilating: (id: string, on: boolean) => void
  setHeaterThermostat: (id: string, on: boolean) => void
  /**
   * Turns the heater Driver's command switch on or off until the Driver restarts (hub ADR 0021). It is
   * the one heater command the Driver accepts while commands are off.
   */
  setHeaterCommandsEnabled: (id: string, enabled: boolean) => void
  /** Integer 1-30 degrees C. */
  setHeaterSetpoint: (id: string, celsius: number) => void
  /** Integer 0-9. */
  setHeaterPowerLevel: (id: string, level: number) => void
  /** Captures the tilt sensor's current attitude as level (park the van level first); the driver persists it. */
  setTiltLevel: (id: string) => void
  /** Clears the captured level, so the angles read raw again. */
  resetTiltLevel: (id: string) => void
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
    setEntityIcon: (entity, id, icon) =>
      publish(TOPIC_ICONS_SET, JSON.stringify({ key: iconKey(entity, id), icon })),
    setRelay: (id, on) => publish(relaySetTopic(id, 'set'), JSON.stringify(on)),
    setHeaterRunning: (id, run) => publish(heaterSetTopic(id, 'set'), JSON.stringify(run)),
    setHeaterMode: (id, mode) => publish(heaterSetTopic(id, 'mode/set'), JSON.stringify(mode)),
    setHeaterVentilating: (id, on) =>
      publish(heaterSetTopic(id, 'ventilating/set'), JSON.stringify(on)),
    setHeaterThermostat: (id, on) =>
      publish(heaterSetTopic(id, 'thermostat/set'), JSON.stringify(on)),
    setHeaterCommandsEnabled: (id, enabled) =>
      publish(heaterSetTopic(id, 'commands_enabled/set'), JSON.stringify(enabled)),
    setHeaterSetpoint: (id, celsius) =>
      publish(heaterSetTopic(id, 'setpoint_c/set'), JSON.stringify(celsius)),
    setHeaterPowerLevel: (id, level) =>
      publish(heaterSetTopic(id, 'power_level/set'), JSON.stringify(level)),
    setRelayName: (id, name) => publish(relaySetTopic(id, 'name/set'), JSON.stringify(name)),
    setRelayGroup: (id, group) => publish(TOPIC_RELAY_GROUPS_SET, JSON.stringify({ id, group })),
    setRelayGroupList: (names) => publish(TOPIC_RELAY_GROUP_LIST_SET, JSON.stringify(names)),
    setRelayOrder: (ids) => publish(TOPIC_RELAY_ORDER_SET, JSON.stringify(ids)),
    // The driver treats any payload as "capture"; `reset` clears. Quoted like every other payload.
    setTiltLevel: (id) => publish(tiltLevelTopic(id), JSON.stringify('capture')),
    resetTiltLevel: (id) => publish(tiltLevelTopic(id), JSON.stringify('reset')),
    setPrimaryBattery: (value) => publish(TOPIC_PRIMARY_BATTERY_SET, JSON.stringify(value)),
  }
}
