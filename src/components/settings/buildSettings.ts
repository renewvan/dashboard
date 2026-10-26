import type { RenewvanBus } from '@/hooks/useRenewvanBus'
import type { usePreferences } from '@/hooks/usePreferences'
import type { DriverRow } from '@/lib/drivers'
import type { SettingsCommands } from '@/lib/settings-commands'
import type { SettingsActions, SettingsData, SettingsPreferences } from './SettingsContext'

interface BuildSettingsInput {
  bus: RenewvanBus
  /** What `App` derives from the bus (see where each is built). */
  derived: Pick<
    SettingsData,
    | 'drivers'
    | 'gps'
    | 'router'
    | 'routerUpdatedAt'
    | 'hub'
    | 'broker'
    | 'primaryBatterySelection'
    | 'unseenAlertCount'
  > & { drivers: DriverRow[] }
  preferences: ReturnType<typeof usePreferences>
  commands: SettingsCommands
  handlers: Pick<SettingsActions, 'sleepDisplay' | 'wakeDisplay' | 'openAlerts'>
}

/**
 * The Settings context's three slices from where each field comes: the bus and what `App` derives
 * from it (data), the stored preferences and the bus's own preference topics (preferences), and
 * every setter and command (actions). The slices are plain objects built each render;
 * `SettingsProvider` keeps each one's reference until a field in it changes.
 */
export function buildSettings({
  bus,
  derived,
  preferences,
  commands,
  handlers,
}: BuildSettingsInput) {
  const { state } = bus
  const data: SettingsData = {
    ...derived,
    tanks: state.tanks,
    temperatures: state.temperatures,
    relays: state.relays,
    batteries: state.batteries,
    solar: state.solar,
    chargers: state.chargers,
    routerHealth: bus.routerHealth,
    busStatus: bus.status,
    tailscale: bus.tailscale,
    hubStatus: bus.hubStatus,
    displayPower: bus.displayPower,
  }
  const prefs: SettingsPreferences = {
    ...preferences.preferences,
    brightness: bus.brightness,
    autoSleepEnabled: bus.autoSleepEnabled,
    autoSleepTimeoutMinutes: bus.autoSleepTimeoutMinutes,
    demoMode: bus.demoMode,
  }
  const actions: SettingsActions = {
    ...preferences.actions,
    ...commands,
    ...handlers,
    setDemoMode: bus.setDemoMode,
  }
  return { data, preferences: prefs, actions }
}
