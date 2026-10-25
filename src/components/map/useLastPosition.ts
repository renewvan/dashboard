import { useEffect } from 'react'

const STORAGE_KEY = 'renewvan-dashboard-last-position'

export type LatLon = readonly [latitude: number, longitude: number]

/** The last position a fix reported, or null if none was stored or the stored value is unusable. */
export function readLastPosition(): LatLon | null {
  if (typeof window === 'undefined') return null
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!Array.isArray(stored) || stored.length !== 2) return null
    const [lat, lon] = stored
    if (typeof lat !== 'number' || typeof lon !== 'number') return null
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
    return [lat, lon]
  } catch {
    return null
  }
}

/**
 * Remembers the van's position across reloads, so the map can open where the van was last seen
 * while the hub or GPS is unavailable. Pass null while there is no fix: nothing is written then.
 */
export function useRememberPosition(position: LatLon | null): void {
  const latitude = position?.[0]
  const longitude = position?.[1]
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([latitude, longitude]))
    } catch {
      // Storage full or blocked: the map just opens on the world view next time.
    }
  }, [latitude, longitude])
}
