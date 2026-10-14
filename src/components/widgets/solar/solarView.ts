import { isCompleteSolar, type Solar } from '@/types'

/** Power bars across the full widget; each is filled bottom-up by its own share of the reading. */
export const BAR_COLUMNS = 8

/** Bars in the compact widget (the one inside the battery dial), which has far less room. */
export const COMPACT_BAR_COLUMNS = 5

/**
 * The hub publishes no array nameplate, so the bars have no fixed 100%. The reference is the
 * highest reading seen this session, held up to this floor so a faint dawn reading cannot
 * light every bar.
 */
export const MIN_REFERENCE_W = 100

/** What the Start-page solar widget shows. */
export interface SolarView {
  /** Live power, rounded, as text. */
  watts: string
  /** Energy harvested today in kWh, one decimal; `—` when the controller does not report it. */
  yieldKwh: string
  /** Bars lit, 0..BAR_COLUMNS, fractional for a partly filled bar. Always 0 while faulted. */
  lit: number
  faulted: boolean
}

/** The first controller that has its required fields (MQTT builds a record up one property at a time). */
export function firstSolar(solar: Record<string, Partial<Solar>>): Solar | undefined {
  return Object.values(solar).find(isCompleteSolar)
}

/** The session peak, never below {@link MIN_REFERENCE_W}. */
export function nextReference(current: number, powerW: number): number {
  return Math.max(MIN_REFERENCE_W, current, powerW)
}

/** Bars lit for `powerW` against `referenceW`, clamped to the row of `columns` bars. */
export function litColumns(powerW: number, referenceW: number, columns = BAR_COLUMNS): number {
  return Math.min(columns, Math.max(0, (powerW / referenceW) * columns))
}

export function formatYield(wh: number | undefined): string {
  return wh === undefined ? '—' : (wh / 1000).toFixed(1)
}

export function solarView(solar: Solar, referenceW: number, columns = BAR_COLUMNS): SolarView {
  const faulted = solar.charge_state === 'fault'
  return {
    watts: String(Math.round(solar.power_w)),
    yieldKwh: formatYield(solar.yield_today_wh),
    lit: faulted ? 0 : litColumns(solar.power_w, referenceW, columns),
    faulted,
  }
}
