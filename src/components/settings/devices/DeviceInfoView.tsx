import type { DeviceRow } from '@/lib/devices'
import { DetailList, DetailRow } from '../shared/DetailList'

/**
 * The Venus-style Device page for one Device (or one fallback row): the same rows in the same
 * order whatever the Device reports, `—` for a value it does not — except the IP address, which
 * only appears when the Device reports one (many have no address of their own). The whole page
 * greys while the Device is offline. The Board serial is shown here in full and nowhere else; the
 * Device's Status is on its own page, above this one.
 */
export function DeviceInfoView({ row }: { row: DeviceRow }) {
  const { info } = row

  return (
    <div className={`flex flex-col gap-3 ${row.dim ? 'opacity-60' : ''}`}>
      <section aria-label="Device" className="flex flex-col gap-3">
        <DetailList label="Device details">
          <DetailRow label="Product" value={info?.product ?? null} />
          <DetailRow label="Source" value={info?.source ?? null} />
          <DetailRow label="Firmware version" value={row.version} />
          <DetailRow label="Board serial" value={info?.board_serial ?? null} />
          {info?.ip !== undefined && <DetailRow label="IP address" value={info.ip} />}
          {/* "renewvan" only when info exists without one: no info at all is not a manufacturer. */}
          <DetailRow
            label="Manufacturer"
            value={info === undefined ? null : (info.manufacturer ?? 'renewvan')}
          />
          <DetailRow label="Homepage" value={info?.homepage ?? null} />
        </DetailList>
        {info === undefined && (
          <p className="text-muted px-1 text-xs">
            This device publishes no info. Update it to see its product and version here.
          </p>
        )}
      </section>
    </div>
  )
}
