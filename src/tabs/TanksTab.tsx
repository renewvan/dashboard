import { Droplet } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { TankCard } from '../components/tank-cards/TankCard'
import { isCompleteTank, type Tank } from '../types'

export interface TanksTabProps {
  tanks: Record<string, Tank>
}

/** Order matters for a stable render: fresh, then grey, then anything else. */
const TANK_ORDER = ['fresh', 'grey']

export function TanksTab({ tanks }: TanksTabProps) {
  // MQTT builds a tank up one property per retained message; skip any id
  // whose record hasn't fully arrived yet (see `isCompleteTank`).
  const ids = Object.keys(tanks)
    .filter((id) => isCompleteTank(tanks[id]))
    .sort((a, b) => TANK_ORDER.indexOf(a) - TANK_ORDER.indexOf(b) || a.localeCompare(b))

  if (ids.length === 0) {
    return (
      <EmptyState
        icon={<Droplet />}
        title="No tank data yet."
        description="Waiting for readings from the renewvan hub."
      />
    )
  }

  return (
    <div
      className="grid h-full gap-2"
      style={{ gridTemplateColumns: `repeat(${ids.length}, minmax(0, 1fr))` }}
    >
      {ids.map((id) => (
        <TankCard key={id} id={id} tank={tanks[id]} />
      ))}
    </div>
  )
}
