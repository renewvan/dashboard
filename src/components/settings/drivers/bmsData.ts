import { protectionLabel } from '@/lib/bmsAlert'
import type { Battery } from '@/types'
import { amps, volts } from './instanceReadings'

export interface BmsRow {
  label: string
  value: string
  /** `warning` is amber: a `false` allow flag Venus cannot tell from "not reporting". */
  tone?: 'warning'
}

export interface BmsBar {
  /** 1-based cell number. */
  index: number
  /** Volts to 3 decimals, or `—` for a cell that could not be read. */
  label: string
  /** 0..1 on the auto-zoomed scale; `null` is a hollow slot, never a zero-height bar. */
  height: number | null
  balancing: boolean
}

export interface BmsCells {
  bars: BmsBar[]
  /** The scale's ends in volts, zoomed to the cells' own range. */
  axis: { low: number; high: number }
  lowest?: { index: number; label: string }
  highest?: { index: number; label: string }
}

export interface BmsGroup {
  cells?: BmsCells
  probes: BmsRow[]
  extremes: BmsRow[]
  permissions: BmsRow[]
  limits: BmsRow[]
  /** Active protection labels; `[]` is "reported, none active", absent is "not reported". */
  protections?: string[]
}

/** The BMS group of a battery's device page, or `undefined` while it publishes none of it. */
export function bmsGroup(battery: Partial<Battery>): BmsGroup | undefined {
  const group: BmsGroup = {
    cells: cellsOf(battery.cell_voltages_v, battery.cell_balancing),
    probes: (battery.temperatures_c ?? []).map((celsius, i) => ({
      label: `Probe ${i + 1}`,
      value: celsius === null ? '—' : `${celsius.toFixed(1)} °C`,
    })),
    extremes: rows(
      ['Highest cell', battery.cell_voltage_max_v, volts3],
      ['Lowest cell', battery.cell_voltage_min_v, volts3],
      ['Cell delta', battery.cell_voltage_delta_v, volts3],
    ),
    permissions: [
      allowRow('Charging allowed', battery.allow_charge),
      allowRow('Discharging allowed', battery.allow_discharge),
    ].filter((row) => row !== undefined),
    limits: rows(
      ['Charge voltage limit', battery.charge_voltage_limit_v, volts],
      ['Charge current limit', battery.charge_current_limit_a, amps],
      ['Discharge current limit', battery.discharge_current_limit_a, amps],
    ),
  }
  if (battery.protections !== undefined)
    group.protections = battery.protections.map(protectionLabel)
  const empty =
    group.cells === undefined &&
    group.extremes.length + group.probes.length + group.permissions.length + group.limits.length ===
      0 &&
    group.protections === undefined
  return empty ? undefined : group
}

const volts3 = (n: number) => `${n.toFixed(3)} V`

function rows(...specs: [string, number | undefined, (n: number) => string][]): BmsRow[] {
  return specs.flatMap(([label, value, format]) =>
    value === undefined ? [] : [{ label, value: format(value) }],
  )
}

function allowRow(label: string, allowed: boolean | undefined): BmsRow | undefined {
  if (allowed === undefined) return undefined
  return allowed ? { label, value: 'Yes' } : { label, value: 'No', tone: 'warning' }
}

function cellsOf(
  volts: (number | null)[] | undefined,
  balancing: (boolean | null)[] | undefined,
): BmsCells | undefined {
  if (volts === undefined || volts.length === 0) return undefined
  // A balancing array of another length cannot be lined up with the cells: ignore it.
  const aligned = balancing?.length === volts.length ? balancing : undefined
  const read = volts.filter((v): v is number => v !== null)
  const min = Math.min(...read)
  const max = Math.max(...read)
  // Pad the range so the lowest cell still draws a bar and a flat pack is not a zero-span scale.
  const pad = Math.max((max - min) * 0.15, 0.02)
  const axis = read.length === 0 ? { low: 0, high: 0 } : { low: min - pad, high: max + pad }
  const bars = volts.map((v, i) => ({
    index: i + 1,
    label: v === null ? '—' : v.toFixed(3),
    height: v === null ? null : (v - axis.low) / (axis.high - axis.low),
    balancing: aligned?.[i] === true,
  }))
  // Like the derived scalars, extremes need two readable cells to mean anything.
  const mark = (v: number) => ({ index: volts.indexOf(v) + 1, label: `${v.toFixed(3)} V` })
  return {
    bars,
    axis,
    lowest: read.length > 1 ? mark(min) : undefined,
    highest: read.length > 1 ? mark(max) : undefined,
  }
}
