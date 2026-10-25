import { useEffect, useState } from 'react'
import { parsePlaceName, placeCell, reverseGeocodeUrl } from '@/lib/placeName'

/**
 * The name of the place at a position (Nominatim reverse geocoding), or null until it arrives or
 * when it cannot be found or reached, and while there is no position (nothing is looked up). Looked up once per ~110 m cell, not per fix, and the last
 * name stays on screen while the next one loads so the readout does not flicker. A response for a
 * cell the van has already left is dropped.
 */
export function useLocationName(lat: number | undefined, lon: number | undefined): string | null {
  const cell = lat === undefined || lon === undefined ? null : placeCell(lat, lon)
  const cellLat = cell?.lat
  const cellLon = cell?.lon
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    if (cellLat === undefined || cellLon === undefined) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(reverseGeocodeUrl(cellLat, cellLon))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const next = parsePlaceName(await res.json())
        if (!cancelled) setName(next)
      } catch {
        // No network or no answer: the readout simply carries no place name.
        if (!cancelled) setName(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [cellLat, cellLon])

  return name
}
