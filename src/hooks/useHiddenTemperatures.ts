import { useStoredState } from '@/hooks/useStoredState'

/**
 * The sensors left off the Temperature page, as sensor ids. The Pi's own CPU thermal zone is
 * hidden until it is switched on: it reads the board, not the van.
 */
export const DEFAULT_HIDDEN_TEMPERATURES: readonly string[] = ['cpu']

const STORAGE_KEY = 'renewvan-dashboard-hidden-temperatures'

/**
 * The stored list: a JSON array of sensor ids. Anything that is not a string is dropped, as are
 * repeats. An empty list is a real choice (every sensor shown); nothing stored, or something that
 * is not a list, reads as the default.
 */
export function parseHiddenTemperatures(stored: string | null): readonly string[] {
  if (stored === null) return DEFAULT_HIDDEN_TEMPERATURES
  try {
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return DEFAULT_HIDDEN_TEMPERATURES
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string'))]
  } catch {
    return DEFAULT_HIDDEN_TEMPERATURES
  }
}

function serializeHiddenTemperatures(ids: readonly string[]): string {
  return JSON.stringify(ids)
}

/**
 * Which sensors the Temperature page leaves out. Kiosk-local with no bus topic, persisted like
 * `usePowerLayout`. A sensor not listed is shown, so a freshly discovered probe appears by default.
 */
export function useHiddenTemperatures() {
  return useStoredState<readonly string[]>(
    STORAGE_KEY,
    parseHiddenTemperatures,
    serializeHiddenTemperatures,
  )
}
