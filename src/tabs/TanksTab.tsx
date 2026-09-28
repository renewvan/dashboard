import { RadialGauge } from '../components/RadialGauge'
import { isCompleteTank, type Tank } from '../types'

export interface TanksTabProps {
  tanks: Record<string, Tank>
}

const FLUID_LABELS: Record<Tank['fluid_type'], string> = {
  fresh_water: 'Fresh water',
  grey_water: 'Grey water',
  black_water: 'Black water',
  fuel: 'Fuel',
  lpg: 'LPG',
}

const STATUS_LABELS: Record<Tank['status'], string> = {
  ok: 'OK',
  open_circuit: 'Sensor fault: open circuit',
  short_circuit: 'Sensor fault: short circuit',
}

/** Order matters for a stable render: fresh, then grey, then anything else. */
const TANK_ORDER = ['fresh', 'grey']

export function TanksTab({ tanks }: TanksTabProps) {
  // MQTT builds a tank up one property per retained message; skip any id
  // whose record hasn't fully arrived yet (see `isCompleteTank`).
  const ids = Object.keys(tanks)
    .filter((id) => isCompleteTank(tanks[id]))
    .sort(
      (a, b) => TANK_ORDER.indexOf(a) - TANK_ORDER.indexOf(b) || a.localeCompare(b),
    )

  if (ids.length === 0) {
    return <p className="text-center text-muted-foreground">No tank data yet.</p>
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      {ids.map((id) => {
        const tank = tanks[id]
        const litersRemaining = Math.round((tank.capacity_l * tank.level_pct) / 100)
        const sub =
          tank.status === 'ok'
            ? `${id} · ${litersRemaining}/${tank.capacity_l} L`
            : `${id} · ${STATUS_LABELS[tank.status]}`
        return (
          <RadialGauge
            key={id}
            pct={tank.level_pct}
            label={FLUID_LABELS[tank.fluid_type]}
            sub={sub}
            color={tank.status === 'ok' ? 'var(--kiosk-accent)' : 'var(--bad)'}
          />
        )
      })}
    </div>
  )
}
