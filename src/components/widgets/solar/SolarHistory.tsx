import { cn } from '@/lib/utils'
import { formatYield, yieldAxis, type YieldHistoryView } from './solarView'

/** A day with no data still shows a stub so the strip keeps its slots and its rhythm. */
const GAP_STUB = '4%'
/** A day that harvested nothing is a real zero: a hairline, distinct from the gap's dashed stub. */
const ZERO_LINE = '2px'
/** The scale's label column (`w-7`) and the gap before it (`gap-1.5`). */
const AXIS_LABELS_INSET = 'mr-[calc(1.75rem+0.375rem)]'

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
 * its parent; display only. With `scale`, faint lines behind the bars mark kWh values, labelled on
 * the right, and the bars are measured against the axis rather than the best day.
 */
export function SolarHistory({
  view,
  scale = false,
  className,
}: {
  view: YieldHistoryView
  scale?: boolean
  className?: string
}) {
  const axis = scale ? yieldAxis(view.referenceWh) : undefined
  return (
    <div className={cn('flex h-full min-w-0 flex-1 flex-col gap-0.5', className)}>
      <div className="flex min-h-0 flex-1 gap-1.5">
        <div
          className="relative flex min-h-0 min-w-0 flex-1 items-end gap-1"
          role="img"
          aria-label={`Solar harvest, last ${view.days.length} days`}
          aria-description={describe(view)}
        >
          {axis?.ticks.map((kwh) => (
            <div
              key={kwh}
              data-testid="solar-history-line"
              className="bg-foreground/15 absolute inset-x-0 h-px"
              style={{ bottom: `${(kwh / axis.maxKwh) * 100}%` }}
            />
          ))}
          {view.days.map(({ daysAgo, wh, share: relative }) => {
            const today = daysAgo === 0
            const share = axis && wh !== null ? wh / 1000 / axis.maxKwh : relative
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
                      wh === null
                        ? GAP_STUB
                        : wh === 0
                          ? ZERO_LINE
                          : `${Math.max(share * 100, 4)}%`,
                  }}
                />
              </div>
            )
          })}
        </div>
        {axis && (
          <div aria-hidden className="text-muted relative w-7 shrink-0 text-[10px] leading-none">
            {axis.ticks.map((kwh) => (
              <span
                key={kwh}
                className="absolute right-0 translate-y-1/2 tabular-nums"
                style={{ bottom: `${(kwh / axis.maxKwh) * 100}%` }}
              >
                {kwh}
              </span>
            ))}
          </div>
        )}
      </div>
      {/* Sighted-only: the strip above already reads every day aloud. */}
      <div
        aria-hidden
        className={cn(
          'text-muted flex justify-between text-[10px] leading-none',
          // Ends on the last bar's edge, not under the scale's labels.
          axis && AXIS_LABELS_INSET,
        )}
      >
        <span>{view.days.length} days</span>
        {axis && <span>kWh</span>}
        <span>today</span>
      </div>
    </div>
  )
}
