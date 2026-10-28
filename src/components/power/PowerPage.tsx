import { useMemo } from 'react'
import { Sun, Zap } from 'lucide-react'
import { PhoneCard } from '@/components/PhoneCard'
import { PowerCard } from '@/components/start/PowerCard'
import { SolarCard } from '@/components/start/SolarCard'
import { useIsMobile } from '@/hooks/use-media-query'
import type { PowerLayout } from '@/hooks/usePowerLayout'
import type { DriverRow } from '@/lib/drivers'
import { instanceLabel } from '@/lib/instances'
import { completeBatteryIds, primaryBattery } from '@/lib/primaryBattery'
import type { Battery, Charger, Solar } from '@/types'
import { firstSolar } from '@/components/widgets/solar/solarView'
import { flowFromBus } from './flowModel'
import { OrbsLayout } from './OrbsLayout'
import { TilesLayout } from './TilesLayout'
import { VanOrbsLayout } from './VanOrbsLayout'
import { VanTilesLayout } from './VanTilesLayout'

interface PowerPageProps {
  batteries: Record<string, Partial<Battery>>
  /** The shared Primary battery choice, `auto` or an instance id (`primaryBattery`). */
  primaryBatterySelection?: string
  /** Names the owning Driver in the label of the battery being read; only needed with several batteries. */
  drivers?: Pick<DriverRow, 'key' | 'name'>[]
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
 * not have. With more than one battery it names, under the layout, the instance it reads.
 *
 * On a phone the page is two cards, as the Start page's are: the flow (the chosen layout, sized for
 * a card) and the solar controller's readings with its harvest history. The kiosk draws the layout
 * alone, with the harvest inside its Solar tile.
 */
export function PowerPage({
  batteries,
  primaryBatterySelection,
  drivers = [],
  solar,
  chargers,
  layout,
}: PowerPageProps) {
  const primary = primaryBattery(batteries, primaryBatterySelection)
  const hasBattery = primary !== undefined
  const flow = useMemo(
    () => flowFromBus(batteries, solar, chargers, primaryBatterySelection),
    [batteries, solar, chargers, primaryBatterySelection],
  )
  const namesSource = completeBatteryIds(batteries).length > 1 && primary !== undefined
  const isMobile = useIsMobile()
  const firstSolarRecord = firstSolar(solar)
  const sourceNote = namesSource && (
    <p data-testid="power-battery-source" className="text-muted shrink-0 text-center text-xs">
      Battery: {instanceLabel(primary.id, primary.battery, drivers)}
    </p>
  )

  if (isMobile) {
    return (
      <section
        aria-label="Power"
        data-testid="pane-power"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-4 pt-3 pb-4"
      >
        <PhoneCard title="Power" icon={<Zap className="size-4" />}>
          <PowerCard flow={flow} layout={layout} />
          {sourceNote}
        </PhoneCard>
        {firstSolarRecord && (
          <PhoneCard title="Solar" icon={<Sun className="size-4" />}>
            <SolarCard solar={firstSolarRecord} />
          </PhoneCard>
        )}
      </section>
    )
  }

  return (
    <section
      aria-label="Power"
      data-testid="pane-power"
      className="relative flex min-h-0 flex-1 flex-col px-8 pb-4"
    >
      {hasBattery ? (
        layout === 'van-tiles' ? (
          <VanTilesLayout flow={flow} solar={firstSolar(solar)} />
        ) : layout === 'van-orbs' ? (
          <VanOrbsLayout flow={flow} solar={firstSolar(solar)} />
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
      {sourceNote}
    </section>
  )
}
