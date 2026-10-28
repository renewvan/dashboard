import type { Battery } from '@/types'
import { DetailList, DetailRow, StatusRow } from '../shared/DetailList'
import { bmsGroup, type BmsCells } from './bmsData'

/** Which cell numbers get a printed index: all of them while they fit, then every 2nd or 4th. */
const indexStep = (count: number) => (count <= 8 ? 1 : count <= 16 ? 2 : 4)

function cellsDescription({ bars }: BmsCells): string {
  return `${bars.length} cells: ${bars.map((bar) => `cell ${bar.index} ${bar.label}`).join(', ')}`
}

/**
 * The cell voltages as display-only vertical bars (nothing here is a tap target), on a scale zoomed
 * to the cells' own range so a few millivolts of spread is visible. An unreadable cell is a hollow
 * slot, never a short bar; a balancing cell carries a mark.
 */
function CellBars({ cells }: { cells: BmsCells }) {
  const step = indexStep(cells.bars.length)
  const balancing = cells.bars.some((bar) => bar.balancing)
  return (
    <section className="flex flex-col gap-2">
      <h2
        aria-hidden="true"
        className="text-muted px-1 text-xs font-medium tracking-wide uppercase"
      >
        Cells
      </h2>
      <div className="border-border bg-surface flex flex-col gap-2 rounded-2xl border px-3.5 py-3">
        <div className="flex gap-2">
          <div
            aria-hidden="true"
            className="text-muted flex flex-col justify-between text-[10px] tabular-nums"
          >
            <span>{cells.axis.high.toFixed(2)} V</span>
            <span>{cells.axis.low.toFixed(2)} V</span>
          </div>
          <div
            role="img"
            aria-label={cellsDescription(cells)}
            className="flex h-32 min-w-0 flex-1 items-end gap-px sm:gap-1"
          >
            {cells.bars.map((bar) => (
              <div
                key={bar.index}
                data-testid="cell-bar"
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${bar.balancing ? 'bg-accent' : 'invisible'}`}
                />
                {bar.height === null ? (
                  <div className="border-border h-full w-full rounded-sm border border-dashed" />
                ) : (
                  <div
                    className="bg-accent w-full rounded-sm"
                    style={{ height: `${bar.height * 100}%` }}
                  />
                )}
                <span aria-hidden="true" className="text-muted h-3 text-[10px] tabular-nums">
                  {(bar.index - 1) % step === 0 ? bar.index : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
        {(cells.lowest || cells.highest || balancing) && (
          <p className="text-muted flex flex-wrap justify-between gap-x-4 text-xs tabular-nums">
            {cells.lowest && (
              <span>
                Lowest {cells.lowest.label} · cell {cells.lowest.index}
              </span>
            )}
            {cells.highest && (
              <span>
                Highest {cells.highest.label} · cell {cells.highest.index}
              </span>
            )}
            {balancing && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="bg-accent size-1.5 rounded-full" />
                Balancing
              </span>
            )}
          </p>
        )}
      </div>
    </section>
  )
}

/**
 * The BMS group of a battery's device page (hub ADR 0022): cells, probes, permissions and limits,
 * protections, in that order. Hidden entirely while the instance publishes none of it, and never
 * fed by a sibling instance. All the shaping lives in `bmsGroup`.
 */
export function BmsDetails({ battery }: { battery: Partial<Battery> }) {
  const group = bmsGroup(battery)
  if (group === undefined) return null
  const permissions = [...group.permissions, ...group.limits]
  return (
    <>
      {group.cells && <CellBars cells={group.cells} />}
      {group.extremes.length > 0 && (
        <DetailList label="Cell extremes">
          {group.extremes.map(({ label, value }) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </DetailList>
      )}
      {group.probes.length > 0 && (
        <DetailList label="Probes" heading>
          {group.probes.map(({ label, value }) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </DetailList>
      )}
      {permissions.length > 0 && (
        <DetailList label="Permissions and limits" heading>
          {permissions.map(({ label, value, tone }) =>
            tone === 'warning' ? (
              <StatusRow key={label} label={label} tone="bg-warning" text={value} />
            ) : (
              <DetailRow key={label} label={label} value={value} />
            ),
          )}
        </DetailList>
      )}
      {group.protections && (
        <DetailList label="Protections" heading>
          {group.protections.length === 0 ? (
            <StatusRow label="None active" tone="bg-success" text="OK" />
          ) : (
            group.protections.map((name) => (
              <StatusRow key={name} label={name} tone="bg-danger" text="Active" />
            ))
          )}
        </DetailList>
      )}
    </>
  )
}
