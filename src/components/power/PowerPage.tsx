import { useMemo } from 'react'
import { Zap } from 'lucide-react'
import type { PowerLayout } from '@/hooks/usePowerLayout'
import { isCompleteBattery, type Battery, type Charger, type Solar } from '@/types'
import { firstSolar } from '@/components/widgets/solar/solarView'
import { flowFromBus } from './flowModel'
import { OrbsLayout } from './OrbsLayout'
import { TilesLayout } from './TilesLayout'
import { VanOrbsLayout } from './VanOrbsLayout'
import { VanTilesLayout } from './VanTilesLayout'

interface PowerPageProps {
  batteries: Record<string, Partial<Battery>>
  solar: Record<string, Partial<Solar>>
  chargers: Record<string, Partial<Charger>>
  /** Tiles, Orbs, or either around the van: Settings › General › Display & Appearance › Power page. */
  layout: PowerLayout
}

/**
 * The Power page: where the van's power comes from, goes to, and what the battery is doing. One
 * snapshot is built from the bus and drawn by the chosen layout, so every layout shows
 * the same numbers. The battery is the page's anchor: until it has published, there is nothing
 * to place the sources and loads around, so the page says so instead of drawing numbers it does
 * not have.
 */
export function PowerPage({ batteries, solar, chargers, layout }: PowerPageProps) {
  const hasBattery = Object.values(batteries).some(isCompleteBattery)
  const flow = useMemo(() => flowFromBus(batteries, solar, chargers), [batteries, solar, chargers])

  return (
    <section
      aria-label="Power"
      data-testid="pane-power"
      className="relative flex min-h-0 flex-1 flex-col px-8 pb-4"
    >
      {hasBattery ? (
        layout === 'van-tiles' ? (
          <VanTilesLayout flow={flow} />
        ) : layout === 'van-orbs' ? (
          <VanOrbsLayout flow={flow} />
        ) : layout === 'orbs' ? (
          <OrbsLayout flow={flow} />
        ) : (
          <TilesLayout flow={flow} solar={firstSolar(solar)} />
        )
      ) : (
        <div
          role="status"
          className="text-muted flex flex-1 flex-col items-center justify-center gap-1 text-center text-sm"
        >
          <Zap aria-hidden="true" className="size-5" />
          <span className="font-semibold">Power</span>
          No data yet
        </div>
      )}
    </section>
  )
}
