import { ChevronRight } from 'lucide-react'
import { Button } from '@heroui/react'
import { tankSummary } from '@/lib/tank-display'
import { temperatureSummary } from '@/lib/temperature'
import { gpsSummary } from '@/lib/gps'
import { entityCountText, instanceCountText, type EntityType, type DriverRow } from '@/lib/drivers'
import { StatusRow } from '../shared/DetailList'
import { GroupRow } from '../shared/GroupRow'
import { useSettings } from '../SettingsContext'
import { DRIVER_TONE } from './driverTone'
import { useReportedTankIds } from './useReportedTankIds'
import type { SettingsSubView } from '../views'
import { isCompleteGps } from '@/types'

/**
 * Entity types with a view of their own: settings (tank, temperature, relay, GPS) or the read-only
 * instances view (battery, solar, charger). Every other type is listed as a static row.
 */
const ENTITY_VIEW: Partial<Record<EntityType, SettingsSubView>> = {
  tank: 'tanks',
  temperature: 'temperature',
  relay: 'relays',
  gps: 'gps',
  battery: 'batteries',
  solar: 'solar',
  charger: 'chargers',
}

/**
 * One Driver's page, titled by the Driver's name: a card with its Status and a Driver row (product,
 * firmware… on its own subpage), then what the Driver publishes. The whole page greys while the
 * Driver is offline.
 */
export function DriverView({
  row,
  onOpen,
}: {
  row: DriverRow
  onOpen: (view: SettingsSubView) => void
}) {
  const { temperatures, gps } = useSettings()
  const tankIds = useReportedTankIds()

  const describe = (type: EntityType, ids: string[]): string => {
    if (type === 'tank') return tankSummary(tankIds)
    if (type === 'temperature') return temperatureSummary(temperatures)
    if (type === 'gps') return gpsSummary(Object.values(gps).find(isCompleteGps))
    if (type === 'battery' || type === 'solar' || type === 'charger') {
      return instanceCountText(type, ids.length)
    }
    return entityCountText(ids.length)
  }

  return (
    <div className={`flex flex-col gap-3 ${row.dim ? 'opacity-60' : ''}`}>
      <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border">
        <dl aria-label="Driver status">
          <StatusRow label="Status" tone={DRIVER_TONE[row.tone]} text={row.status} />
        </dl>
        <Button
          variant="ghost"
          fullWidth
          onPress={() => onOpen('driver-info')}
          className="h-auto! justify-between! gap-3! rounded-none! px-3.5! py-3! text-sm font-medium whitespace-normal! md:h-auto!"
        >
          Driver
          <ChevronRight aria-hidden="true" className="text-muted size-4 shrink-0" />
        </Button>
      </div>
      {row.entities.length > 0 && (
        <section aria-label="Publishes" className="flex flex-col gap-2">
          <h2 className="text-muted px-1 text-xs font-medium tracking-wide uppercase">Publishes</h2>
          <ul aria-label="Entities" className="flex flex-col gap-2">
            {row.entities.map(({ type, label, ids }) => {
              const view = ENTITY_VIEW[type]
              return (
                <li key={type}>
                  {view !== undefined ? (
                    <GroupRow
                      label={label}
                      description={describe(type, ids)}
                      onOpen={() => onOpen(view)}
                    />
                  ) : (
                    <div className="border-border bg-surface flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-muted text-xs tabular-nums">{describe(type, ids)}</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
