import { cn } from '@/lib/utils'
import { formatYield, type YieldHistoryView } from './solarView'

/** A day with no data still shows a stub so the strip keeps its slots and its rhythm. */
const GAP_STUB = '4%'
/** A day that harvested nothing is a real zero: a hairline, distinct from the gap's dashed stub. */
const ZERO_LINE = '2px'

function dayLabel(daysAgo: number): string {
  if (daysAgo === 0) return 'today'
  return daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`
}

function describe(view: YieldHistoryView): string {
  return [...view.days]
    .reverse()
    .map(({ daysAgo, wh }) =>
      wh === null
        ? `${dayLabel(daysAgo)}: no data`
        : `${dayLabel(daysAgo)}: ${formatYield(wh)} kWh`,
    )
    .join(', ')
}

/**
 * The controller's own daily harvest as a strip of bars, oldest on the left and today on the
 * right in the accent colour. Every bar shares one scale (the window's best day), so heights
 * compare across days. A day with no data (`null`) is a dashed stub, never a zero-height bar: the
 * controller did not report it, which is not the same as harvesting nothing. Fills the height of
 * its parent; display only.
 */
export function SolarHistory({ view, className }: { view: YieldHistoryView; className?: string }) {
  return (
    <div className={cn('flex h-full min-w-0 flex-1 flex-col gap-0.5', className)}>
      <div
        className="flex min-h-0 flex-1 items-end gap-1"
        role="img"
        aria-label={`Solar harvest, last ${view.days.length} days`}
        aria-description={describe(view)}
      >
        {view.days.map(({ daysAgo, wh, share }) => {
          const today = daysAgo === 0
          return (
            <div
              key={daysAgo}
              data-testid="solar-history-day"
              data-gap={wh === null ? 'true' : undefined}
              className="flex h-full min-w-0 flex-1 items-end"
            >
              <div
                className={cn(
                  'w-full rounded-lg',
                  wh === null
                    ? 'border-foreground/30 border border-dashed'
                    : today
                      ? 'bg-accent'
                      : 'bg-foreground/40',
                )}
                style={{
                  height:
                    wh === null ? GAP_STUB : wh === 0 ? ZERO_LINE : `${Math.max(share * 100, 4)}%`,
                }}
              />
            </div>
          )
        })}
      </div>
      {/* Sighted-only: the strip above already reads every day aloud. */}
      <div aria-hidden className="text-muted flex justify-between text-[10px] leading-none">
        <span>{view.days.length} days</span>
        <span>today</span>
      </div>
    </div>
  )
}
