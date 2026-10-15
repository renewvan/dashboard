import { useMemo } from 'react'
import { Zap } from 'lucide-react'
import type { PowerLayout } from '@/hooks/usePowerLayout'
import { isCompleteBattery, type Battery, type Charger, type Solar } from '@/types'
import { firstSolar } from '@/components/widgets/solar/solarView'
import { useSolarReference } from '@/components/widgets/solar/useSolarReference'
import { flowFromBus } from './flowModel'
import { PowerFlow } from './PowerFlow'
import { PowerTiles } from './PowerTiles'

interface PowerPageProps {
  batteries: Record<string, Partial<Battery>>
  solar: Record<string, Partial<Solar>>
  chargers: Record<string, Partial<Charger>>
  /** Tiles or Flow: Settings › General › Display & Appearance › Power page. */
  layout: PowerLayout
}

/**
 * The Power page: where the van's power comes from, goes to, and what the battery is doing. One
 * snapshot is built from the bus and drawn by the chosen layout, so Tiles and Flow always show
 * the same numbers. The battery is the page's anchor: until it has published, there is nothing
 * to place the sources and loads around, so the page says so instead of drawing numbers it does
 * not have.
 */
export function PowerPage({ batteries, solar, chargers, layout }: PowerPageProps) {
  const hasBattery = Object.values(batteries).some(isCompleteBattery)
  const flow = useMemo(() => flowFromBus(batteries, solar, chargers), [batteries, solar, chargers])
  // The Solar tile's bars are the Start page's solar readout: the same controller and the same
  // session-peak reference, so the bars fill the same way on both pages.
  const solarRecord = firstSolar(solar)
  const solarReferenceW = useSolarReference(solarRecord?.power_w)
  const solarBars = solarRecord && { solar: solarRecord, referenceW: solarReferenceW }

  return (
    <section
      aria-label="Power"
      data-testid="pane-power"
      className="relative flex min-h-0 flex-1 flex-col px-8 pb-4"
    >
      {hasBattery ? (
        layout === 'flow' ? (
          <PowerFlow flow={flow} />
        ) : (
          <PowerTiles flow={flow} solarBars={solarBars} />
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
