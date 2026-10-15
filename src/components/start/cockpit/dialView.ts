import { FILL_COLOR } from '@/components/tanks/severity'
import { tankView } from '@/components/tanks/tankView'
import { isCompleteBattery, isCompleteTank, type Battery, type Tank } from '@/types'

/** What one Start-page dial shows. `undefined` from the builders below means "no data yet". */
export interface DialView {
  label: string
  /** 0..100, the arc fill. Always 0 while faulted. */
  pct: number
  /** Litres in the tank (0 while faulted, like `pct`); `undefined` for the battery, which has no volume. */
  litres?: number
  /** The `fill` colour of the arc: severity only, the same keys the Tanks page paints with. */
  color: string
  /** Line under the number, e.g. `13.20V / 35W` or `46 / 100 ℓ`; the fault reason when faulted. */
  sub: string
  /** Colour the unit letters (`V`, `W`, `ℓ`) of `sub` stronger than the muted numbers. */
  unitsStrong?: boolean
  faulted: boolean
}

const BATTERY_COLOR = FILL_COLOR.accent

/** The first battery that has fully arrived (MQTT builds a record up one property at a time). */
export function batteryDial(batteries: Record<string, Partial<Battery>>): DialView | undefined {
  const battery = Object.values(batteries).find(isCompleteBattery)
  if (!battery) return undefined
  return {
    label: 'Battery',
    pct: Math.min(100, Math.max(0, battery.soc_pct)),
    color: BATTERY_COLOR,
    sub: `${battery.voltage_v.toFixed(2)}V / ${Math.round(Math.abs(battery.power_w))}W`,
    unitsStrong: true,
    faulted: false,
  }
}

/**
 * A tank as a dial. Level, litres, fault handling and the severity colour all come from
 * `tankView`, so a dial and its Tanks-page card cannot disagree.
 */
export function tankDial(tank: Tank, now: Date): DialView {
  const view = tankView(tank, now)
  return {
    label: view.fluidLabel,
    pct: view.pct,
    litres: view.faulted ? 0 : view.litres,
    color: FILL_COLOR[view.severity],
    sub: view.faulted
      ? (view.status?.label ?? 'Fault')
      : `${view.litres} / ${view.capacityL} \u2113`,
    unitsStrong: !view.faulted,
    faulted: view.faulted,
  }
}

/** The first complete tank of a fluid type; ids are arbitrary, the fluid is what the page asks for. */
export function tankDialOf(
  tanks: Record<string, Partial<Tank>>,
  fluid: Tank['fluid_type'],
  now: Date,
): DialView | undefined {
  const tank = Object.values(tanks).find((t) => isCompleteTank(t) && t.fluid_type === fluid)
  return tank && isCompleteTank(tank) ? tankDial(tank, now) : undefined
}
