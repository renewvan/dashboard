import type { ReactNode } from 'react'
import { ClipboardClock, Thermometer, WavesArrowUp, WavesArrowDown } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader } from '../ui/card'
import { FLUID_LABELS, STATUS_LABELS } from '../../lib/tank-labels'
import { tankLiquidColor } from '../../lib/tank-alarm'
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

/** One telemetry row of the card's info column: accent icon + muted
 *  label, bold value beneath — the reference mockup's section shape. */
function InfoField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs">
        <span className="text-[var(--kiosk-accent)]">{icon}</span>
        <span className="text-muted-foreground dark:text-[var(--kiosk-accent)]">{label}</span>
      </div>
      <div className="text-sm font-semibold">{value}</div>
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
 * committed `alarm_state: alarm`. Banding stays keyed on the raw
 * `tank.level_pct` (per hub/schema/tank.schema.json: alarms/thresholds
 * never key off `level_pct_smoothed`) even though the fill height/%/
 * liters shown to the driver use the smoothed value — the two can
 * legitimately disagree by a percent or two on a stepped sender without
 * the alarm band flickering off the smoothing.
 */
export function TankCard({ id, tank }: TankCardProps) {
  const ok = tank.status === 'ok'
  const pct = Math.min(100, Math.max(0, tank.level_pct_smoothed))
  const alarmPct = Math.min(100, Math.max(0, tank.level_pct))
  const liters = Math.round((tank.capacity_l * tank.level_pct_smoothed) / 100)
  const liquidColor = tankLiquidColor(tank, alarmPct)
  // Fresh water reads as "refilled" (last_full_at); every other fluid
  // type reads as "emptied" (last_empty_at) — mirrors the footer label's
  // pre-existing fresh-water-only special case, now paired with the
  // matching latch timestamp instead of a hardcoded stub date.
  const isRefill = tank.fluid_type === 'fresh_water'
  const latchDate = isRefill ? tank.last_full_at : tank.last_empty_at

  return (
    <Card data-testid="tank-card" className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-5 py-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-sm">{FLUID_LABELS[tank.fluid_type]}</div>
        </div>
        <Badge variant={ok ? 'success' : 'destructive'} size="sm">
          {ok ? 'Normal' : 'Fault'}
        </Badge>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col items-center gap-2 px-3 py-2">
        {!ok && (
          <div className="shrink-0 text-center text-destructive-foreground text-xs">{STATUS_LABELS[tank.status]}</div>
        )}
        <div className="flex min-h-0 flex-1 items-stretch gap-2">
          <div className="flex justify-between items-stretch gap-4">
            <div className="flex min-h-0 flex-1 items-stretch gap-1">
              <div className="flex min-h-0 flex-col items-center gap-2">
                <div className="relative min-h-0 w-[125px] flex-1 overflow-hidden rounded-xl border bg-[var(--panel-2)]">
                  {GRIDLINES.map((mark) => (
                    <div
                      key={mark}
                      className="absolute inset-x-0 border-t border-[--alpha(var(--bg)/50%)] z-1000"
                      style={{ bottom: `${mark}%` }}
                    />
                  ))}
              <div
                data-testid="tank-liquid"
                className="absolute inset-x-0 bottom-0 flex items-start justify-center rounded-t-sm pt-1 text-[12px] text-white font-semibold transition-[height]"
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
                <div className="shrink-0 text-muted-foreground text-sm font-semibold">
                  {liters}/{tank.capacity_l} {'\u2113'}
                </div>
              </div>
              {/* Percentage scale: a tick-marked vertical axis, one small horizontal
                  divider per labelled value (100/75/50/25/0%), per the reference mockup. */}
              <div className="flex flex-col justify-between text-[10px]  pb-5">
                {SCALE_MARKS.map((mark) => (
                  <div key={mark} className="flex items-center gap-1">
                    <span className="h-px w-2 bg-border" />
                    <span>{mark}%</span>
                  </div>
                ))}
            
              </div>
            </div>
            {/* Telemetry info column per the reference mockup: blue icon +
                label, bold value below; Flow Rates carries fill and
                drain side by side (drain label dimmed per the mockup).
                "Fill Rate"/"Drain Rate" show volume_since_full_l/
                volume_since_empty_l (net liters moved since the last
                full/empty latch) per hub/schema/tank.schema.json v0.4 —
                despite the label, these are cumulative volumes, not the
                schema's separate fill_rate_lpm/drain_rate_lpm instantaneous
                LPM fields (explicit choice, not a units mismatch). */}
            <div className="flex shrink-0 flex-col justify-between gap-2 py-10" data-testid="tank-info-column">
              <InfoField icon={<Thermometer className="size-4" />} label="Temperature" value="23°C" />
              <InfoField icon={<WavesArrowUp className="size-4" />} label="Fill Rate" value={`${Math.round(tank.volume_since_full_l)} L`} />
              <InfoField icon={<WavesArrowDown className="size-4" />} label="Drain Rate" value={`${Math.round(tank.volume_since_empty_l)} L`} />
            </div>
          </div>
        </div>
      </CardContent>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-2">
        <div className="flex min-w-0 items-center gap-1  text-xs ">
          <ClipboardClock className="size-3.5 shrink-0" />
          <span className="truncate font-semibold">{`Last ${isRefill ? 'refilled' : 'emptied'}:`}</span>
          <span className="truncate font-normal">{latchDate ? formatLatchDate(latchDate) : '—'}</span>
        </div>
        <ConfigureButton size="icon-xl" iconOnly round />
      </div>
    </Card>
  )
}
