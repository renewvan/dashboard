import { tankLevelStatus, tankSeverity, type TankSeverity } from '@/lib/tank-alarm'
import { consumptionRateLph } from '@/lib/tank-display'
import { FLUID_LABELS, STATUS_LABELS } from '@/lib/tank-labels'
import type { Tank } from '@/types'

export interface TankLabel {
  label: string
  severity: TankSeverity
}

/** Everything a tank layout shows, derived once so the card and the row cannot disagree. */
export interface TankView {
  fluidLabel: string
  /** Level clamped to 0..100; 0 while faulted (the reading is not trustworthy). */
  pct: number
  /** Litres remaining, from the raw level. */
  litres: number
  capacityL: number
  faulted: boolean
  /** Fill severity: the same key paints the gauge and the badge. */
  severity: TankSeverity
  badge: TankLabel
  /** Hidden (undefined) with no alarm configured and no fault. */
  status: TankLabel | undefined
  temperature: string
  /** Fresh water: drains from a refill. Every other tank fills from an empty-out. */
  isRefill: boolean
  rateLabel: 'Drain Rate' | 'Fill Rate'
  rate: string
}

const NO_VALUE = '--'

export function tankView(tank: Tank, now: Date): TankView {
  const faulted = tank.status !== 'ok'
  const clamped = Math.min(100, Math.max(0, tank.level_pct))
  const pct = faulted ? 0 : clamped
  const levelStatus = faulted ? undefined : tankLevelStatus(tank, clamped)

  // Fresh water reads as "refilled" (last_full_at) and drains; every other
  // fluid reads as "emptied" (last_empty_at) and fills.
  const isRefill = tank.fluid_type === 'fresh_water'
  const latchIso = isRefill ? tank.last_full_at : tank.last_empty_at
  const rateLph = consumptionRateLph(
    isRefill ? tank.volume_since_full_l : tank.volume_since_empty_l,
    latchIso,
    now,
  )

  const badge: TankLabel = faulted
    ? { label: 'Fault', severity: 'danger' }
    : levelStatus
      ? { label: levelStatus.label, severity: levelStatus.color }
      : { label: 'Normal', severity: 'accent' }

  return {
    fluidLabel: FLUID_LABELS[tank.fluid_type],
    pct,
    litres: Math.round((tank.capacity_l * tank.level_pct) / 100),
    capacityL: tank.capacity_l,
    faulted,
    severity: tankSeverity(tank, clamped),
    badge,
    status: faulted
      ? { label: STATUS_LABELS[tank.status], severity: 'danger' }
      : levelStatus
        ? badge
        : undefined,
    temperature: tank.temperature_c != null ? `${tank.temperature_c.toFixed(0)}°C` : NO_VALUE,
    isRefill,
    rateLabel: isRefill ? 'Drain Rate' : 'Fill Rate',
    rate: rateLph !== undefined ? `${rateLph.toFixed(1)} L/h` : NO_VALUE,
  }
}
