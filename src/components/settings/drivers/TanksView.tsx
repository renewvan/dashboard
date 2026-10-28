import { FLUID_LABELS } from '@/lib/tank-labels'
import { EntityCard } from '../shared/EntityCard'
import { tankSummary } from './entitySummary'
import { useSettingsData } from '../SettingsContext'
import { useReportedTankIds } from './useReportedTankIds'

/** Settings › Drivers › Tanks: one drill-in per reported tank. */
export function TanksView({ onOpen }: { onOpen: (tankId: string) => void }) {
  const { tanks } = useSettingsData()
  const ids = useReportedTankIds()

  if (ids.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        No tanks found. Waiting for driver-tank to publish.
      </p>
    )
  }

  return (
    <ul aria-label="Tanks" className="flex flex-col gap-2">
      {ids.map((id) => {
        const tank = tanks[id]
        return (
          <li key={id}>
            <EntityCard
              label={tank.fluid_type ? FLUID_LABELS[tank.fluid_type] : id}
              summary={tankSummary(tank)}
              onOpen={() => onOpen(id)}
            />
          </li>
        )
      })}
    </ul>
  )
}
