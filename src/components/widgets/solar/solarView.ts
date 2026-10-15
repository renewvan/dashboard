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

/** Days of harvest the Power page's Solar tile charts: today and the nine before it. */
export const HISTORY_DAYS = 10

/**
 * Floor for the history chart's scale, in Wh, so a week of overcast days (tens of Wh) cannot
 * stretch to fill the chart and read as a good week.
 */
export const MIN_HISTORY_REFERENCE_WH = 100

/** One day in the history chart. */
export interface YieldDay {
  /** Days before today: 0 is today. */
  daysAgo: number
  /** Harvest in watt-hours, or `null` when the controller has no data for the day. */
  wh: number | null
  /** Bar height as a 0..1 share of the chart's scale; 0 for a gap or a day that harvested nothing. */
  share: number
}

/** What the Solar tile's history chart draws. */
export interface YieldHistoryView {
  /** Oldest first, so today is the last (rightmost) entry. Never padded past what the controller logged. */
  days: YieldDay[]
  /** Watt-hours that fill a full-height bar: the window's best day, never below the floor. */
  referenceWh: number
}

/**
 * The last `count` days of the controller's own log, oldest first. The log is newest first with
 * index 0 as today, and as short as the controller's own history, so a new controller yields
 * fewer than `count` days rather than invented empty ones. `null` stays a gap and is not `0`.
 * Returns `undefined` when the controller publishes no history, so the chart is not drawn.
 */
export function yieldHistoryView(
  history: readonly (number | null)[] | undefined,
  count = HISTORY_DAYS,
): YieldHistoryView | undefined {
  if (!history || history.length === 0) return undefined
  const window = history.slice(0, count)
  const referenceWh = Math.max(MIN_HISTORY_REFERENCE_WH, ...window.map((wh) => wh ?? 0))
  const days = window
    .map((wh, daysAgo) => ({
      daysAgo,
      wh,
      share: wh === null ? 0 : Math.min(1, wh / referenceWh),
    }))
    .reverse()
  return { days, referenceWh }
}
