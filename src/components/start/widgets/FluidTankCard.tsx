import { PhoneCard } from '@/components/PhoneCard'
import { FLUID_ICONS } from '@/components/tanks/fluidIcon'
import { TankRow } from '@/components/tanks/TankRow'
import { isCompleteTank, type Tank } from '@/types'
import { NoData } from '../NoData'
import type { StartWidgetProps } from './types'

/** The first complete tank of a fluid type, with its bus id; ids are arbitrary, the fluid is the ask. */
function tankOf(tanks: Record<string, Partial<Tank>>, fluid: Tank['fluid_type']) {
  for (const [id, tank] of Object.entries(tanks)) {
    if (isCompleteTank(tank) && tank.fluid_type === fluid) return { id, tank }
  }
  return undefined
}

/** One fluid's tank as the Tanks page's own phone card, or its empty state until the tank reports. */
export function FluidTankCard({
  fluid,
  label,
  tanks,
  now,
  onConfigureTank,
}: StartWidgetProps & { fluid: Tank['fluid_type']; label: string }) {
  const found = tankOf(tanks, fluid)
  if (found) {
    return <TankRow id={found.id} tank={found.tank} now={now} onConfigure={onConfigureTank} />
  }
  const Icon = FLUID_ICONS[fluid]
  return (
    <PhoneCard title={label} icon={<Icon className="size-4" />}>
      <NoData label={label} icon={<Icon className="size-4" />} />
    </PhoneCard>
  )
}

export function FreshWaterCard(props: StartWidgetProps) {
  return <FluidTankCard {...props} fluid="fresh_water" label="Fresh water" />
}

export function GreyWaterCard(props: StartWidgetProps) {
  return <FluidTankCard {...props} fluid="grey_water" label="Grey water" />
}
