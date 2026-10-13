import { Sun } from 'lucide-react'
import type { Solar } from '@/types'
import { BAR_COLUMNS, solarView } from './solarView'

const ROWS = 5

export interface SolarWidgetProps {
  solar: Solar
  /** Power that fills every bar: the session peak (the bus carries no array nameplate). */
  referenceW: number
}

/**
 * Start-page solar readout: a ramp of power bars with the live watts beside it, over the
 * harvest today. Its rows line up with {@link TiltWidget}'s compact layout beside it: the bars
 * and watts at the van icons' height, one shared separator line, then the value and label rows.
 * A cell is lit by the share of the reading that reaches it, so a partly filled bar shows only
 * its lower cells. A fault shows the word instead of a number and lights nothing.
 */
export function SolarWidget({ solar, referenceW }: SolarWidgetProps) {
  const view = solarView(solar, referenceW)
  return (
    <div
      data-testid="solar-card"
      className="flex h-18 w-full max-w-60 shrink-0 flex-col items-center"
    >
      <div className="flex h-9 w-full items-end justify-between gap-1">
        <div
          className="flex h-full min-w-0 flex-1 items-end gap-0.5"
          role="meter"
          aria-label="Solar power"
          aria-valuemin={0}
          aria-valuemax={referenceW}
          aria-valuenow={Math.min(solar.power_w, referenceW)}
          aria-valuetext={view.faulted ? 'Fault' : `${view.watts} W`}
        >
          {Array.from({ length: BAR_COLUMNS }, (_, bar) => {
            const barLit = Math.max(0, Math.min(1, view.lit - bar))
            const litCells = Math.round(barLit * ROWS)
            return (
              <div
                key={bar}
                className="flex min-w-0 flex-1 flex-col-reverse gap-0.5"
                // Each bar is taller than the last, 40% to 100% of the row.
                style={{ height: `${40 + (bar / (BAR_COLUMNS - 1)) * 60}%` }}
              >
                {Array.from({ length: ROWS }, (_, cell) => (
                  <div
                    key={cell}
                    className={`min-h-0 flex-1 rounded-xs ${cell < litCells ? 'bg-accent' : 'bg-foreground/15'}`}
                  />
                ))}
              </div>
            )
          })}
        </div>
        <div className="shrink-0 text-right" aria-hidden="true">
          {view.faulted ? (
            <div className="text-danger text-lg font-semibold">Fault</div>
          ) : (
            <div
              data-testid="solar-watts"
              className="flex items-baseline justify-end text-3xl leading-none font-light italic tabular-nums"
            >
              {view.watts}
              <span className="text-accent ml-0.5 text-sm font-semibold">W</span>
            </div>
          )}
        </div>
      </div>
      <div className="bg-foreground/35 mt-0.5 h-0.5 w-full shrink-0 rounded" />
      <div className="mt-0.5 flex flex-col items-center gap-0.5" aria-hidden="true">
        <span data-testid="solar-yield" className="text-lg leading-none font-bold tabular-nums">
          {view.yieldKwh}
          <span className="text-muted ml-0.5 text-[10px] font-normal">kWh</span>
        </span>
        <span className="text-muted flex items-center gap-1 text-[10px] leading-none">
          <Sun className="size-2.5" />
          Solar today
        </span>
      </div>
    </div>
  )
}
