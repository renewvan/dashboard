import { Droplet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { PrototypeSwitcher } from '../components/PrototypeSwitcher'
import { RadialGauge } from '../components/RadialGauge'
import { VariantA, VariantB, VariantC } from './TanksTab.prototype-variants'
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

const PROTOTYPE_VARIANTS = [
  { key: 'A', name: 'Tank silhouette' },
  { key: 'B', name: 'Compact row' },
  { key: 'C', name: 'Numeric-first' },
]

/**
 * PROTOTYPE-ONLY. No MQTT broker running locally means `tanks` is often
 * `{}` — fall back to this fixture so the variant is actually visible
 * without a live hub. Real data (once connected) always wins.
 */
const PROTOTYPE_FIXTURE_TANKS: Record<string, Tank> = {
  fresh: { fluid_type: 'fresh_water', capacity_l: 70, level_pct: 37.4, status: 'ok' },
  grey: { fluid_type: 'grey_water', capacity_l: 70, level_pct: 0, status: 'open_circuit' },
}


/**
 * PROTOTYPE-ONLY (see `skill://prototype` and wayfinder ticket
 * `.scratch/tanks-card-redesign/issues/01-prototype-tank-card.md`). Reads
 * `?variant=A|B|C` from the URL, dev builds only. Stripped from production
 * bundles by the `import.meta.env.PROD` check below; delete this hook and
 * its call site once ticket 01 resolves.
 */
function usePrototypeVariant(): [string | null, (key: string) => void] {
  const [variant, setVariant] = useState<string | null>(() =>
    import.meta.env.PROD ? null : new URLSearchParams(window.location.search).get('variant'),
  )
  useEffect(() => {
    if (import.meta.env.PROD) return
    const params = new URLSearchParams(window.location.search)
    if (variant) params.set('variant', variant)
    else params.delete('variant')
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
  }, [variant])
  return [variant, setVariant]
}

export function TanksTab({ tanks }: TanksTabProps) {
  const [variant, setVariant] = usePrototypeVariant()

  if (!import.meta.env.PROD && variant) {
    const Variant = { A: VariantA, B: VariantB, C: VariantC }[variant] ?? VariantA
    const variantTanks = Object.keys(tanks).length > 0 ? tanks : PROTOTYPE_FIXTURE_TANKS
    return (
      <>
        <Variant tanks={variantTanks} />
        <PrototypeSwitcher variants={PROTOTYPE_VARIANTS} current={variant} onChange={setVariant} />
      </>
    )
  }

  // MQTT builds a tank up one property per retained message; skip any id
  // whose record hasn't fully arrived yet (see `isCompleteTank`).
  const ids = Object.keys(tanks)
    .filter((id) => isCompleteTank(tanks[id]))
    .sort(
      (a, b) => TANK_ORDER.indexOf(a) - TANK_ORDER.indexOf(b) || a.localeCompare(b),
    )

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
