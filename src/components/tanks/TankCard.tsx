import { Card } from '@heroui/react'
import type { Tank } from '@/types'
import { FILL_COLOR, FILL_TEXT_COLOR } from './severity'
import { SeverityChip, TankFooter, TankStats } from './TankParts'
import { tankView } from './tankView'

export interface TankCardProps {
  /** The tank's bus id, handed back to `onConfigure`. */
  id: string
  tank: Tank
  /** Injected so the pace is deterministic under test. */
  now: Date
  /** Opens this tank's settings. */
  onConfigure: (id: string) => void
}

const SCALE_MARKS = [100, 75, 50, 25, 0]
const GRIDLINES = [25, 50, 75]
/** Below this the in-fill % would not fit inside the fill, so it moves above it. */
const LABEL_INSIDE_FROM_PCT = 16

/**
 * Kiosk layout ("silhouette"): a vertical liquid-fill gauge with a percentage
 * scale and quartile gridlines beside an info column. Fills its grid cell, so
 * the gauge takes whatever height `TanksTab` leaves.
 *
 * HeroUI's component CSS is unlayered, so utilities that override it carry `!`:
 * the card's padding and gap, and every border colour (HeroUI's base sheet sets
 * `* { border-color }` unlayered too).
 */
export function TankCard({ id, tank, now, onConfigure }: TankCardProps) {
  const view = tankView(tank, now)
  const fill = FILL_COLOR[view.severity]

  return (
    <Card className="h-full min-h-0 gap-0! p-0!">
      <Card.Header className="flex-row! items-center justify-between gap-2 px-5 py-3">
        <div className="min-w-0 truncate text-sm font-semibold">{view.fluidLabel}</div>
        <SeverityChip badge={view.badge} />
      </Card.Header>
      <Card.Content className="min-h-0 flex-1 flex-row! gap-4 px-6 py-2">
        <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-2 self-stretch">
          <div className="flex min-h-0 min-w-0 flex-col items-center gap-1">
            <div className="border-border! bg-surface-secondary relative min-h-0 w-[140px] flex-1 overflow-hidden rounded-xl border-2">
              {GRIDLINES.map((mark) => (
                <div
                  key={mark}
                  className="border-foreground/35! absolute inset-x-0 z-10 border-t"
                  style={{ bottom: `${mark}%` }}
                />
              ))}
              <div
                className="absolute inset-x-0 bottom-0 overflow-hidden text-xs font-semibold transition-[height]"
                style={{
                  height: `${view.pct}%`,
                  background: fill,
                  color: FILL_TEXT_COLOR[view.severity],
                }}
              >
                {!view.faulted && view.pct >= LABEL_INSIDE_FROM_PCT && (
                  <div className="pt-1 text-center">{view.pct.toFixed(0)}%</div>
                )}
              </div>
              {!view.faulted && view.pct < LABEL_INSIDE_FROM_PCT && (
                <div className="absolute inset-x-0 top-1 text-center text-xs font-semibold">
                  {view.pct.toFixed(0)}%
                </div>
              )}
            </div>
            {!view.faulted && (
              <div className="text-muted shrink-0 text-sm font-semibold">
                {view.litres}/{view.capacityL} {'\u2113'}
              </div>
            )}
          </div>
          {/* Tick-marked scale: one label per 100/75/50/25/0%. */}
          <div
            data-testid="tank-scale"
            className="flex flex-col justify-between pb-6 text-[10px] leading-none"
          >
            {SCALE_MARKS.map((mark) => (
              <div key={mark} className="flex items-center gap-1">
                <span className="bg-border h-px w-2" />
                <span>{mark}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 flex-col justify-between gap-2 py-8">
          <TankStats view={view} />
        </div>
      </Card.Content>
      <TankFooter view={view} onConfigure={() => onConfigure(id)} />
    </Card>
  )
}
