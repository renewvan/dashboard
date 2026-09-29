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
 */
export function HomeTab({ tanks, batteries }: HomeTabProps) {
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
