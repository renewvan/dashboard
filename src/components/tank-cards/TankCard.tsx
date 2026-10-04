import type { ReactNode } from 'react'
import { ClipboardClock, Gauge, Thermometer, WavesArrowUp, WavesArrowDown } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader } from '../ui/card'
import { FLUID_LABELS, STATUS_LABELS } from '../../lib/tank-labels'
import { TANK_SEVERITY_COLOR, tankLevelStatus, tankLiquidColor } from '../../lib/tank-alarm'
import type { Tank } from '../../types'
import { ConfigureButton } from './ConfigureButton'

export interface TankCardProps {
  id: string
  tank: Tank
}

const SCALE_MARKS = [100, 75, 50, 25, 0]
const GRIDLINES = [25, 50, 75]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Formats an ISO-8601 `last_full_at`/`last_empty_at` timestamp (local UTC
 * offset, per hub/schema/tank.schema.json) into the footer's
 * "14 Jul 2026 09:41" style — date plus 24h time, no weekday name. A
 * fixed day/month/year/hour/minute shape, not `toLocaleDateString` —
 * its locale defaults add punctuation/reorder the fields (e.g. en-US
 * gives "Jul 14, 2026, 9:41 AM"), which would silently change the
 * footer's look depending on the browser's locale; this kiosk always
 * renders the same shape regardless. */
function formatLatchDate(iso: string): string {
  const date = new Date(iso)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ${hh}:${mm}`
}

/** Average pace in liters/hour since `latchIso` (the fluid_type-relevant
 *  `last_full_at`/`last_empty_at`), derived from the matching
 *  `volume_since_full_l`/`volume_since_empty_l` -- both already
 *  unconditional live fields, no schema addition needed. Undefined
 *  when there's no latch yet (nothing to measure a pace against), or
 *  the latch is under a minute old (avoids a near-infinite rate the
 *  instant a tank crosses full/empty, before any real time has passed). */
function consumptionRateLph(volumeL: number, latchIso: string | undefined): number | undefined {
  if (!latchIso) return undefined
  const elapsedHours = (Date.now() - new Date(latchIso).getTime()) / 3_600_000
  if (elapsedHours < 1 / 60) return undefined
  return volumeL / elapsedHours
}

/** One telemetry row of the card's info column: accent icon + muted
 *  label, bold value beneath — the reference mockup's section shape. */
function InfoField({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: ReactNode
  label: string
  value: string
  /** Overrides the value's text color (e.g. the Status row's zone severity); defaults to the card's normal text color. */
  valueColor?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs">
        <span className="text-[var(--accent)]">{icon}</span>
        <span className="text-muted-foreground dark:text-[var(--accent)]">{label}</span>
      </div>
      <div className="text-sm font-semibold" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
    </div>
  )
}

/**
 * Shipped default tank card ("tank silhouette"): a vertical liquid-fill
 * gauge with a tick-marked percentage scale and quartile gridlines.
 * Fills its grid cell (`h-full`) — `TanksTab` gives each card an equal
 * share of the tab's full width/height, so the silhouette grows to
 * whatever vertical space that leaves. Winning layout from wayfinder
 * ticket `01-prototype-tank-card`. Pure presentational component —
 * props in, markup out, per `RadialGauge`'s pattern.
 *
 * Liquid color carries alarm severity (see lib/tank-alarm.ts): blue in
 * the normal band, amber between alarm threshold and restore, red at/
 * past the threshold, while faulted, or while the bus reports a
 * committed `alarm_state: alarm`. Fill height/%/liters and the alarm
 * band both key off `tank.level_pct` — the sender's actual reading
 * (per docs/adr/0005 in hub, node-tank no longer publishes a smoothed
 * display value).
 */
export function TankCard({ tank }: TankCardProps) {
  const ok = tank.status === 'ok'

  const pct = Math.min(100, Math.max(0, tank.level_pct))
  const liters = Math.round((tank.capacity_l * tank.level_pct) / 100)
  const liquidColor = tankLiquidColor(tank, pct)
  // Fresh water reads as "refilled" (last_full_at); every other fluid
  // type reads as "emptied" (last_empty_at) — mirrors the footer label's
  // pre-existing fresh-water-only special case, now paired with the
  // matching latch timestamp instead of a hardcoded stub date.
  const isRefill = tank.fluid_type === 'fresh_water'
  const latchDate = isRefill ? tank.last_full_at : tank.last_empty_at
  const levelStatus = tankLevelStatus(tank, pct)

  // Fresh water/fuel/lpg: refilled at last_full_at, so the meaningful pace
  // to show is how fast it's draining since that refill. Grey/black water:
  // emptied at last_empty_at, so the meaningful pace is how fast it's
  // filling since that empty-out. Same direction the footer/latch date
  // already reads in.
  const rateLph = consumptionRateLph(
    isRefill ? tank.volume_since_full_l : tank.volume_since_empty_l,
    latchDate,
  )

  return (
    <Card data-testid="tank-card" className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-5 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{FLUID_LABELS[tank.fluid_type]}</div>
        </div>
        <Badge variant={!ok ? 'error' : levelStatus ? levelStatus.color : 'success'} size="sm">
          {!ok ? 'Fault' : levelStatus ? levelStatus.label : 'Normal'}
        </Badge>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col items-center gap-2 px-3 py-2">
        <div className="flex min-h-0 flex-1 items-stretch gap-2">
          <div className="flex items-stretch justify-between gap-4">
            <div className="flex min-h-0 flex-1 items-stretch gap-1">
              <div className="flex min-h-0 flex-col items-center gap-2">
                <div className="relative min-h-0 w-[125px] flex-1 overflow-hidden rounded-xl border bg-[var(--panel-2)]">
                  {GRIDLINES.map((mark) => (
                    <div
                      key={mark}
                      className="absolute inset-x-0 z-1000 border-t border-[--alpha(var(--bg)/50%)]"
                      style={{ bottom: `${mark}%` }}
                    />
                  ))}
                  <div
                    data-testid="tank-liquid"
                    className="absolute inset-x-0 bottom-0 flex items-start justify-center rounded-t-sm pt-1 text-[12px] font-semibold text-white transition-[height]"
                    style={{ height: `${pct}%`, background: liquidColor }}
                  >
                    {pct >= 16 && `${pct.toFixed(0)}%`}
                  </div>
                  {pct < 16 && (
                    <div className="absolute inset-x-0 top-1 text-center text-[10px] font-semibold">
                      {pct.toFixed(0)}%
                    </div>
                  )}
                </div>
                <div className="text-muted-foreground shrink-0 text-sm font-semibold">
                  {liters}/{tank.capacity_l} {'\u2113'}
                </div>
              </div>
              {/* Percentage scale: a tick-marked vertical axis, one small horizontal
                  divider per labelled value (100/75/50/25/0%), per the reference mockup. */}
              <div className="flex flex-col justify-between pb-6 text-[10px]">
                {SCALE_MARKS.map((mark) => (
                  <div key={mark} className="flex items-center gap-1">
                    <span className="bg-border h-px w-2" />
                    <span>{mark}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Telemetry info column per the reference mockup: blue icon +
                label, bold value below. Up to three rows, each hidden when
                not applicable: Status (level zone, hidden with no alarm
                configured -- see tankLevelStatus), Temperature (hidden with
                no NTC temperature sensor configured), and a pace-based Fill/Drain
                Rate in L/h since the last refill/empty-out (hidden until a
                first latch exists) -- replaces the earlier design that
                showed volume_since_full_l/volume_since_empty_l as static
                cumulative totals under a "Rate" label with no time unit. */}
            <div
              className="flex shrink-0 flex-col justify-between gap-2 py-12"
              data-testid="tank-info-column"
            >
              {(!ok || levelStatus) && (
                <InfoField
                  icon={<Gauge className="size-4" />}
                  label="Status"
                  value={
                    !ok
                      ? STATUS_LABELS[tank.status]
                      : (levelStatus as NonNullable<typeof levelStatus>).label
                  }
                  valueColor={
                    !ok
                      ? 'var(--bad)'
                      : (levelStatus as NonNullable<typeof levelStatus>).label === 'Full' &&
                          tank.alarm_direction === 'low'
                        ? ''
                        : TANK_SEVERITY_COLOR[
                            (levelStatus as NonNullable<typeof levelStatus>).color
                          ]
                  }
                />
              )}
              <InfoField
                icon={<Thermometer className="size-4" />}
                label="Temperature"
                value={tank.temperature_c != null ? `${tank.temperature_c.toFixed(0)}°C` : '--°C'}
              />
              <InfoField
                icon={
                  isRefill ? (
                    <WavesArrowDown className="size-4" />
                  ) : (
                    <WavesArrowUp className="size-4" />
                  )
                }
                label={isRefill ? 'Drain Rate' : 'Fill Rate'}
                value={rateLph !== undefined ? `${rateLph.toFixed(1)} L/h` : '--'}
              />
            </div>
          </div>
        </div>
      </CardContent>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-2">
        <div className="flex min-w-0 items-center gap-1 text-xs">
          <ClipboardClock className="size-3.5 shrink-0" />
          <span className="truncate font-semibold">{`Last ${isRefill ? 'refilled' : 'emptied'}:`}</span>
          <span className="truncate font-normal">
            {latchDate ? formatLatchDate(latchDate) : '—'}
          </span>
        </div>
        <ConfigureButton size="icon-xl" iconOnly round />
      </div>
    </Card>
  )
}
