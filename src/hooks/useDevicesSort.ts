import { useStoredState } from '@/hooks/useStoredState'

/** How Settings › Devices is grouped: one row per Driver, or a section per entity type. */
export type DevicesSort = 'driver' | 'entity'

export const DEVICES_SORT_CHOICES: readonly DevicesSort[] = ['driver', 'entity']

const STORAGE_KEY = 'renewvan-dashboard-devices-sort'

/** By Driver, the list Devices always was, so a kiosk that never touches the toggle keeps it. */
export const DEFAULT_DEVICES_SORT: DevicesSort = 'driver'

function parseDevicesSort(stored: string | null): DevicesSort {
  return DEVICES_SORT_CHOICES.find((choice) => choice === stored) ?? DEFAULT_DEVICES_SORT
}

/**
 * The kiosk's Devices grouping preference. Kiosk-local with no bus topic, persisted like
 * `useStartView`, so coming back to Devices keeps the grouping last chosen; anything stored that is
 * not a known choice reads as By Driver.
 */
export function useDevicesSort(): [DevicesSort, (sort: DevicesSort) => void] {
  return useStoredState<DevicesSort>(STORAGE_KEY, parseDevicesSort)
}
