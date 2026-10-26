import { Zap } from 'lucide-react'
import { PhoneCard } from '@/components/PhoneCard'
import { flowFromBus } from '@/components/power/flowModel'
import { PowerCard } from '../PowerCard'
import type { StartWidgetProps } from './types'

/** The power flow, drawn as the Power page's layout choice calls for. */
export function PowerFlowCard({
  batteries,
  solar,
  chargers,
  primaryBatterySelection,
  powerLayout,
}: StartWidgetProps) {
  const flow = flowFromBus(batteries, solar, chargers, primaryBatterySelection)

  return (
    <PhoneCard title="Power" icon={<Zap className="size-4" />}>
      <PowerCard flow={flow} layout={powerLayout} />
    </PhoneCard>
  )
}
