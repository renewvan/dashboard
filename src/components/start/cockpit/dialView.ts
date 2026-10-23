import { IDLE_W } from '@/components/power/flowModel'
import { FILL_COLOR } from '@/components/tanks/severity'
import { tankView } from '@/components/tanks/tankView'
import { primaryBattery } from '@/lib/primaryBattery'
import type { TankSeverity } from '@/lib/tank-alarm'
import { isCompleteTank, type Battery, type Tank } from '@/types'

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
  /** The battery is taking charge (above `IDLE_W`, as on the Power page): its dial then shows the travelling band. */
  charging?: boolean
  faulted: boolean
}

/**
 * The three colours of a Start-page ring, and nothing else: blue is fine, amber-500 is an alert, red is
 * wrong or bad (empty or full on the wrong side, a fault). Red is the theme's `--danger`; the amber is
 * Tailwind's amber-500 rather than the theme's paler `--warning`, which badges and the Tanks page keep.
 */
const RING_OK = FILL_COLOR.accent
const RING_ALERT = '#f59e0b'
const RING_BAD = FILL_COLOR.danger

/** A battery at or below this state of charge is amber, and at or below `BATTERY_BAD_PCT` red. The Power
 *  page already paints the battery red from 20%. */
const BATTERY_ALERT_PCT = 40
const BATTERY_BAD_PCT = 20

function batteryColor(pct: number) {
  if (pct <= BATTERY_BAD_PCT) return RING_BAD
  return pct <= BATTERY_ALERT_PCT ? RING_ALERT : RING_OK
}

/**
 * A tank ring's colour from the Tanks page's severity (the alarm zones), with the wrong extreme red
 * even for a tank with no alarm configured: empty for fresh water, fuel and LPG, full for the waste
 * tanks. A zone the Tanks page paints success (a good extreme) is blue here.
 */
function tankColor(
  severity: TankSeverity,
  fluid: Tank['fluid_type'],
  pct: number,
  faulted: boolean,
) {
  if (faulted || severity === 'danger') return RING_BAD
  const wasteFluid = fluid === 'grey_water' || fluid === 'black_water'
  const wrongExtreme = wasteFluid ? Math.round(pct) >= 100 : Math.round(pct) <= 0
  if (wrongExtreme) return RING_BAD
  return severity === 'warning' ? RING_ALERT : RING_OK
}

/** The Primary battery as a dial (`primaryBattery`: the shared choice, else the first complete one by id). */
export function batteryDial(
  batteries: Record<string, Partial<Battery>>,
  selection?: string,
): DialView | undefined {
  const battery = primaryBattery(batteries, selection)?.battery
  if (!battery) return undefined
  const pct = Math.min(100, Math.max(0, battery.soc_pct))
  return {
    label: 'Battery',
    pct,
    color: batteryColor(pct),
    sub: `${battery.voltage_v.toFixed(2)}V / ${Math.round(Math.abs(battery.power_w))}W`,
    unitsStrong: true,
    charging: battery.power_w > IDLE_W,
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
    color: tankColor(view.severity, tank.fluid_type, view.pct, view.faulted),
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
