import { useEffect, useState } from 'react'

/** How the Power page draws the van's power: boxed `tiles`, or round nodes on an `orbs` diagram. */
export type PowerLayout = 'tiles' | 'orbs'

export const POWER_LAYOUTS: readonly PowerLayout[] = ['tiles', 'orbs']

export const POWER_LAYOUT_LABELS: Record<PowerLayout, string> = {
  tiles: 'Tiles',
  orbs: 'Orbs',
}

const STORAGE_KEY = 'renewvan-dashboard-power-layout'

const DEFAULT_POWER_LAYOUT: PowerLayout = 'tiles'

/** What this key held before the Orbs layout was renamed; kiosks that chose it keep their choice. */
const LEGACY_LAYOUTS: Record<string, PowerLayout> = { flow: 'orbs' }

function readStoredPowerLayout(): PowerLayout {
  if (typeof window === 'undefined') return DEFAULT_POWER_LAYOUT
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return (
    POWER_LAYOUTS.find((layout) => layout === stored) ??
    (stored === null ? undefined : LEGACY_LAYOUTS[stored]) ??
    DEFAULT_POWER_LAYOUT
  )
}

/**
 * Which layout the Power page uses. Kiosk-local preference with no bus topic, persisted like
 * `useNavbarPosition` so the choice survives a reload or power cycle. A value from before the
 * rename (`flow`) reads as `orbs`; anything else that is not a known layout (an edited or older
 * value) reads as the default, `tiles`.
 */
export function usePowerLayout(): [PowerLayout, (layout: PowerLayout) => void] {
  const [layout, setLayout] = useState<PowerLayout>(readStoredPowerLayout)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, layout)
  }, [layout])

  return [layout, setLayout]
}
