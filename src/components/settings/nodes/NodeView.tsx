import { tankSummary } from '@/lib/tank-display'
import { temperatureSummary } from '@/lib/temperature'
import { entityCountText, type EntityType, type NodeRow } from '@/lib/nodes'
import { DetailList, DetailRow, StatusRow } from '../shared/DetailList'
import { GroupRow } from '../shared/GroupRow'
import { useSettings } from '../SettingsContext'
import { NODE_TONE } from './nodeTone'
import { useReportedTankIds } from './useReportedTankIds'
import type { SettingsSubView } from '../views'

/** Entity types that have settings of their own; every other type is listed read-only. */
const ENTITY_VIEW: Partial<Record<EntityType, SettingsSubView>> = {
  tank: 'tanks',
  temperature: 'temperature',
}

/**
 * The Venus-style Device page for one Node (or one fallback row): the same seven rows in the same
 * order whatever the Node reports, `—` for a value it does not, then what it publishes. The whole
 * page greys while the Node is offline. The Host serial is shown here in full and nowhere else.
 */
export function NodeView({
  row,
  onOpen,
}: {
  row: NodeRow
  onOpen: (view: SettingsSubView) => void
}) {
  const { temperatures } = useSettings()
  const tankIds = useReportedTankIds()
  const { info } = row

  const describe = (type: EntityType, ids: string[]): string => {
    if (type === 'tank') return tankSummary(tankIds)
    if (type === 'temperature') return temperatureSummary(temperatures)
    return entityCountText(ids.length)
  }

  return (
    <div className={`flex flex-col gap-3 ${row.dim ? 'opacity-60' : ''}`}>
      <section aria-label="Device" className="flex flex-col gap-3">
        <DetailList label="Device details">
          <StatusRow label="Status" tone={NODE_TONE[row.tone]} text={row.status} />
          <DetailRow label="Product" value={info?.product ?? null} />
          <DetailRow label="Source" value={info?.source ?? null} />
          <DetailRow label="Firmware version" value={row.version} />
          <DetailRow label="Host serial" value={info?.host_serial ?? null} />
          {/* "renewvan" only when info exists without one: no info at all is not a manufacturer. */}
          <DetailRow
            label="Manufacturer"
            value={info === undefined ? null : (info.manufacturer ?? 'renewvan')}
          />
          <DetailRow label="Homepage" value={info?.homepage ?? null} />
        </DetailList>
        {info === undefined && (
          <p className="text-muted px-1 text-xs">
            This node publishes no info. Update it to see its product and version here.
          </p>
        )}
      </section>
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
