import { useEffect, useState } from 'react'
import { parsePlaceName, placeCell, reverseGeocodeUrl } from '@/lib/placeName'

/**
 * The name of the place at a position (Nominatim reverse geocoding), or null until it arrives or
 * when it cannot be found or reached. Looked up once per ~110 m cell, not per fix, and the last
 * name stays on screen while the next one loads so the readout does not flicker. A response for a
 * cell the van has already left is dropped.
 */
export function useLocationName(lat: number, lon: number): string | null {
  const cell = placeCell(lat, lon)
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(reverseGeocodeUrl(cell.lat, cell.lon))
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
  }, [cell.lat, cell.lon])

  return name
}
