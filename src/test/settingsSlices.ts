import type {
  SettingsActions,
  SettingsContextValue,
  SettingsData,
  SettingsPreferences,
} from '@/components/settings/SettingsContext'

const PREFERENCE_KEYS = [
  'brightness',
  'autoSleepEnabled',
  'autoSleepTimeoutMinutes',
  'alertsEnabled',
  'demoMode',
  'theme',
  'navbarPosition',
  'startPowerSources',
  'powerLayout',
  'mapTheme',
  'van',
]

/**
 * A test's flat `SettingsContextValue` as the three slices `SettingsProvider` takes: spread it onto
 * the provider, `<SettingsProvider {...settingsSlices(value)}>`. A function is an action, a key in
 * `PREFERENCE_KEYS` a preference, anything else data.
 */
export function settingsSlices(value: SettingsContextValue): {
  data: SettingsData
  preferences: SettingsPreferences
  actions: SettingsActions
} {
  const data: Record<string, unknown> = {}
  const preferences: Record<string, unknown> = {}
  const actions: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'function') actions[key] = entry
    else if (PREFERENCE_KEYS.includes(key)) preferences[key] = entry
    else data[key] = entry
  }
  return {
    data: data as unknown as SettingsData,
    preferences: preferences as unknown as SettingsPreferences,
    actions: actions as unknown as SettingsActions,
  }
}
