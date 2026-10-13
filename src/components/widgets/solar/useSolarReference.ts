import { useState } from 'react'
import { MIN_REFERENCE_W, nextReference } from './solarView'

/**
 * The power that fills every bar: the highest reading seen since the page loaded, never below
 * {@link MIN_REFERENCE_W}. The peak is state raised during render (React's supported "adjust state
 * while rendering" pattern), so the very render that brings a new peak already scales against it:
 * an effect would first draw one frame against the old, smaller reference and overfill the bars.
 * It resets on reload: the hub carries no array nameplate to restore it from.
 */
export function useSolarReference(powerW: number | undefined): number {
  const [peak, setPeak] = useState(MIN_REFERENCE_W)
  const next = powerW === undefined ? peak : nextReference(peak, powerW)
  if (next !== peak) setPeak(next)
  return next
}
