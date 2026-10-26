import { Battery } from 'lucide-react'
import { PhoneCard } from '@/components/PhoneCard'
import { CockpitDial } from '../cockpit/CockpitDial'
import { batteryDial } from '../cockpit/dialView'
import { NoData } from '../NoData'
import type { StartWidgetProps } from './types'

/** The Primary battery's cockpit dial (the dial is the battery's alone here). */
export function BatteryCard({ batteries, primaryBatterySelection, isDark }: StartWidgetProps) {
  const battery = batteryDial(batteries, primaryBatterySelection)

  return (
    <PhoneCard title="Battery" icon={<Battery className="size-4" />}>
      {battery ? (
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
      )}
    </PhoneCard>
  )
}
