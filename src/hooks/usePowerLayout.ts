import { useEffect, useState } from 'react'

/** How the Power page draws the van's power: boxed `tiles`, or round nodes on a `flow` diagram. */
export type PowerLayout = 'tiles' | 'flow'

export const POWER_LAYOUTS: readonly PowerLayout[] = ['tiles', 'flow']

export const POWER_LAYOUT_LABELS: Record<PowerLayout, string> = {
  tiles: 'Tiles',
  flow: 'Flow',
}

const STORAGE_KEY = 'renewvan-dashboard-power-layout'

const DEFAULT_POWER_LAYOUT: PowerLayout = 'tiles'

function readStoredPowerLayout(): PowerLayout {
  if (typeof window === 'undefined') return DEFAULT_POWER_LAYOUT
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return POWER_LAYOUTS.find((layout) => layout === stored) ?? DEFAULT_POWER_LAYOUT
}

/**
 * Which layout the Power page uses. Kiosk-local preference with no bus topic, persisted like
 * `useNavbarPosition` so the choice survives a reload or power cycle. Anything stored that is not
 * a known layout (an edited or older value) reads as the default, `tiles`.
 */
export function usePowerLayout(): [PowerLayout, (layout: PowerLayout) => void] {
  const [layout, setLayout] = useState<PowerLayout>(readStoredPowerLayout)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, layout)
  }, [layout])

  return [layout, setLayout]
}
