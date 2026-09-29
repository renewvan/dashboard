import { Van } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { isCompleteBattery, isCompleteTank } from '../types'
import { PowerTab, type PowerTabProps } from './PowerTab'
import { TanksTab, type TanksTabProps } from './TanksTab'

export interface HomeTabProps {
  tanks: TanksTabProps['tanks']
  batteries: PowerTabProps['batteries']
}

/**
 * Landing tab — an at-a-glance overview instead of a dedicated new data
 * model: reuses `TanksTab`/`PowerTab` as-is (same gauges, same "no data
 * yet" states) under section headings, rather than duplicating their
 * rendering logic for a bespoke summary layout. Tanks and batteries are
 * what a driver most wants to check first; Switches and Settings stay
 * one tap away in the sidebar.
 *
 * When neither has any data yet, this renders a single combined empty
 * state instead of `TanksTab`'s and `PowerTab`'s own empty states
 * stacked one above the other — two near-identical "No X data yet /
 * Waiting for readings..." blocks read as redundant noise, not two
 * distinct pieces of information, on a first-connect landing screen.
 * As soon as either has real data, both sections render normally again
 * (including either one's own individual empty state, if only one of
 * the two is still missing).
 */
export function HomeTab({ tanks, batteries }: HomeTabProps) {
  const hasTanks = Object.values(tanks).some(isCompleteTank)
  const hasBatteries = Object.values(batteries).some(isCompleteBattery)

  if (!hasTanks && !hasBatteries) {
    return (
      <EmptyState
        icon={<Van />}
        title="No data yet."
        description="Waiting for readings from the renewvan hub."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Tanks</h2>
        <TanksTab tanks={tanks} />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Power</h2>
        <PowerTab batteries={batteries} />
      </section>
    </div>
  )
}
