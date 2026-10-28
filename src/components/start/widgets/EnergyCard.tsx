import { Battery, Zap } from 'lucide-react'
import { PhoneCard } from '@/components/PhoneCard'
import { flowFromBus } from '@/components/power/flowModel'
import { Carousel } from '../Carousel'
import { CockpitDial } from '../cockpit/CockpitDial'
import { batteryDial } from '../cockpit/dialView'
import { NoData } from '../NoData'
import { PowerCard } from '../PowerCard'
import type { StartWidgetProps } from './types'

/** A carousel of the power flow, then the battery's cockpit dial (the dial is the battery's alone here). */
export function EnergyCard({
  batteries,
  solar,
  chargers,
  primaryBatterySelection,
  powerLayout,
  isDark,
  onOpenInstance,
}: StartWidgetProps) {
  const battery = batteryDial(batteries, primaryBatterySelection)
  const flow = flowFromBus(batteries, solar, chargers, primaryBatterySelection)

  return (
    <PhoneCard title="Energy" icon={<Zap className="size-4" />}>
      <Carousel
        label="Energy"
        slides={[
          {
            id: 'flow',
            label: 'Power flow',
            content: <PowerCard flow={flow} layout={powerLayout} onOpenInstance={onOpenInstance} />,
          },
          {
            id: 'battery',
            label: 'Battery',
            content: battery ? (
              <CockpitDial
                view={battery}
                icon={<Battery className="size-4" />}
                size="focus"
                glow={isDark}
                pulse={battery.charging}
                aligned={false}
                className="mt-3 -mb-[12%] max-w-[300px]"
              />
            ) : (
              <NoData icon={<Battery className="size-4" />} label="Battery" />
            ),
          },
        ]}
      />
    </PhoneCard>
  )
}
