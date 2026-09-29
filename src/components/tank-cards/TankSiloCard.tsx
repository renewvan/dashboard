import { ClipboardCheck } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader } from '../ui/card'
import { FLUID_LABELS, STATUS_LABELS } from '../../lib/tank-labels'
import type { Tank } from '../../types'
import { ConfigureButton } from './ConfigureButton'

export interface TankSiloCardProps {
  id: string
  tank: Tank
}

const SCALE_MARKS = [100, 75, 50, 25, 0]
const GRIDLINES = [25, 50, 75]

/**
 * Shipped default tank card ("tank silhouette"): a vertical liquid-fill
 * gauge with a tick-marked percentage scale and quartile gridlines.
 * Fills its grid cell (`h-full`) — `TanksTab` gives each card an equal
 * share of the tab's full width/height, so the silhouette grows to
 * whatever vertical space that leaves. Winning layout from wayfinder
 * ticket `01-prototype-tank-card`. Pure presentational component —
 * props in, markup out, per `RadialGauge`'s pattern.
 */
export function TankSiloCard({ id, tank }: TankSiloCardProps) {
  const ok = tank.status === 'ok'
  const pct = Math.min(100, Math.max(0, tank.level_pct))
  const liters = Math.round((tank.capacity_l * tank.level_pct) / 100)

  return (
    <Card data-testid="tank-silo-card" className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-sm">{FLUID_LABELS[tank.fluid_type]}</div>
          <div className="text-muted-foreground text-xs">{id}</div>
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
          <div className="flex min-h-0 flex-col items-center gap-1">
            <div className="relative min-h-0 w-[130px] flex-1 overflow-hidden rounded-xl border bg-[var(--panel-2)]">
              {GRIDLINES.map((mark) => (
                <div
                  key={mark}
                  className="absolute inset-x-0 border-t border-[var(--bg)]"
                  style={{ bottom: `${mark}%` }}
                />
              ))}
              <div
                className="absolute inset-x-0 bottom-0 flex items-start justify-center rounded-t-sm pt-1 text-[12px] text-white font-semibold transition-[height]"
                style={{ height: `${pct}%`, background: ok ? 'var(--kiosk-accent)' : 'var(--bad)' }}
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
              {liters}/{tank.capacity_l} <i className="font-bold">L.</i>
            </div>
          </div>
          {/* Percentage scale: a tick-marked vertical axis, one small horizontal
              divider per labelled value (100/75/50/25/0%), per the reference mockup. */}
          <div className="flex flex-col justify-between text-[10px] text-muted-foreground">
            {SCALE_MARKS.map((mark) => (
              <div key={mark} className="flex items-center gap-1">
                <span className="h-px w-2 bg-border" />
                <span>{mark}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
          <ClipboardCheck className="size-3.5 shrink-0" />
          <span className="truncate">Last inspection: 14-07-2024</span>
        </div>
        <ConfigureButton size="icon-xl" iconOnly round />
      </div>
    </Card>
  )
}
