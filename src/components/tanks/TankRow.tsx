import { Card } from '@heroui/react'
import { FILL_COLOR } from './severity'
import { SeverityChip, OpenTank, TankStats } from './TankParts'
import { tankView } from './tankView'
import { TankIcon } from './TankIcon'
import type { TankCardProps } from './TankCard'

const GRIDLINES = [25, 50, 75]

/**
 * Phone layout ("row list"): one full-width row per tank, sections stacked:
 * name and badge, the percentage large above a horizontal fill bar, the same
 * stats as the kiosk card, and the same footer. No tick labels; the 25/50/75%
 * gridlines stay. Same HeroUI `!` caveats as `TankCard`.
 */
export function TankRow({ id, tank, now, onConfigure }: TankCardProps) {
  const view = tankView(tank, now)

  return (
    <Card className="relative shrink-0 gap-0! p-0!">
      <OpenTank view={view} onOpen={() => onConfigure(id)} />
      <Card.Header className="mb-4 flex-row! items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <TankIcon id={id} tank={tank} className="text-muted size-4 shrink-0" />
          <span className="truncate">{view.fluidLabel}</span>
        </div>
        <SeverityChip badge={view.badge} />
      </Card.Header>
      <Card.Content className="gap-2 px-4 pb-6">
        {!view.faulted && (
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-4xl leading-none font-semibold">{view.pct.toFixed(0)}%</div>
            <div className="text-muted text-sm font-semibold">
              {view.litres}/{view.capacityL} {'\u2113'}
            </div>
          </div>
        )}
        <div className="border-border! bg-surface-secondary relative h-6 overflow-hidden rounded-lg border-2">
          {GRIDLINES.map((mark) => (
            <div
              key={mark}
              className="border-foreground/35! absolute inset-y-0 z-10 border-l"
              style={{ left: `${mark}%` }}
            />
          ))}
          <div
            className="absolute inset-y-0 left-0 transition-[width]"
            style={{ width: `${view.pct}%`, background: FILL_COLOR[view.severity] }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <TankStats view={view} />
        </div>
      </Card.Content>
    </Card>
  )
}
