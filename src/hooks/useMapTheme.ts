import { useStoredState } from '@/hooks/useStoredState'

/**
 * Which look the Map page draws: `auto` follows the app's theme (a light app gets the light map, a
 * dark one the dark map), or the map is pinned to `light` or `dark` whatever the app is. A pinned
 * dark map suits a kiosk that is used in the daytime under a light theme but should not glare at
 * night; a pinned light map is the reverse.
 */
export type MapThemeChoice = 'auto' | 'light' | 'dark'

export const MAP_THEME_CHOICES: readonly MapThemeChoice[] = ['auto', 'light', 'dark']

export const MAP_THEME_LABELS: Record<MapThemeChoice, string> = {
  auto: 'Auto',
  light: 'Light',
  dark: 'Dark',
}

const STORAGE_KEY = 'renewvan-dashboard-map-theme'

/** Auto, so a kiosk that never touches the setting keeps the map matching the app, as before. */
const DEFAULT_MAP_THEME: MapThemeChoice = 'auto'

function parseMapTheme(stored: string | null): MapThemeChoice {
  return MAP_THEME_CHOICES.find((choice) => choice === stored) ?? DEFAULT_MAP_THEME
}

/**
 * The look the Map page uses once `auto` is resolved against the app's theme: the one thing the
 * page needs, so it takes a plain `isDark` and never sees the choice.
 */
export function resolveMapIsDark(choice: MapThemeChoice, appIsDark: boolean): boolean {
  return choice === 'auto' ? appIsDark : choice === 'dark'
}

/**
 * The Map page's theme preference. Kiosk-local with no bus topic, persisted like `usePowerLayout`
 * so it survives a reload or power cycle. Anything stored that is not a known choice (an edited or
 * older value) reads as `auto`.
 */
export function useMapTheme(): [MapThemeChoice, (choice: MapThemeChoice) => void] {
  return useStoredState<MapThemeChoice>(STORAGE_KEY, parseMapTheme)
}
