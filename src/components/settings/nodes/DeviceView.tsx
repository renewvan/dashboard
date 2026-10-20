import type { NodeRow } from '@/lib/nodes'
import { DetailList, DetailRow } from '../shared/DetailList'

/**
 * The Venus-style Device page for one Node (or one fallback row): the same six rows in the same
 * order whatever the Node reports, `—` for a value it does not. The whole page greys while the
 * Node is offline. The Host serial is shown here in full and nowhere else; the Node's Status is on
 * its own page, above this one.
 */
export function DeviceView({ row }: { row: NodeRow }) {
  const { info } = row

  return (
    <div className={`flex flex-col gap-3 ${row.dim ? 'opacity-60' : ''}`}>
      <section aria-label="Device" className="flex flex-col gap-3">
        <DetailList label="Device details">
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
    </div>
  )
}
