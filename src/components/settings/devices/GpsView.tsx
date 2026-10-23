import { isCompleteGps, type Gps, type GpsSatellite } from '@/types'
import {
  fixLabel,
  formatSnr,
  groupSatellites,
  satelliteName,
  signalFraction,
  signalQuality,
  trackedCount,
  type SignalQuality,
} from '@/lib/gps'
import { DetailList, DetailRow } from '../shared/DetailList'
import { useSettings } from '../SettingsContext'

/** The bar's colour, from the theme's status tokens. Never the only cue: the row also says it. */
const BAR_TONE: Record<SignalQuality, string> = {
  none: 'bg-border',
  poor: 'bg-error',
  fair: 'bg-warning',
  good: 'bg-success',
  strong: 'bg-success',
}

const QUALITY_TEXT: Record<SignalQuality, string> = {
  none: 'not measured yet',
  poor: 'poor',
  fair: 'fair',
  good: 'good',
  strong: 'strong',
}

/** A reading to `digits` decimals with an optional unit; `null` (a `—` row) when it is absent. */
function reading(value: number | undefined, digits: number, unit?: string): string | null {
  if (value === undefined) return null
  const text = value.toFixed(digits)
  return unit === undefined ? text : `${text} ${unit}`
}

/** The fix time as the receiver's UTC clock, `2026-10-16 08:01:30 UTC`; the wire is ISO with +00:00. */
function formatFixTime(iso: string | undefined): string | null {
  if (iso === undefined) return null
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`
}

function SatelliteRow({ sat }: { sat: GpsSatellite }) {
  const quality = signalQuality(sat.snr_db)
  return (
    <li
      aria-label={`${satelliteName(sat)}, ${formatSnr(sat.snr_db)}, ${QUALITY_TEXT[quality]}`}
      className="flex min-h-11 items-center gap-3 px-3.5 py-2"
    >
      <span aria-hidden="true" className="w-10 shrink-0 text-sm tabular-nums">
        {sat.prn}
      </span>
      <div
        aria-hidden="true"
        className="bg-border/40 h-2.5 min-w-0 flex-1 overflow-hidden rounded-full"
      >
        <div
          data-testid="signal-bar"
          className={`h-full rounded-full ${BAR_TONE[quality]}`}
          style={{ width: `${signalFraction(sat.snr_db) * 100}%` }}
        />
      </div>
      <span aria-hidden="true" className="text-muted w-20 shrink-0 text-right text-xs tabular-nums">
        {formatSnr(sat.snr_db)}
      </span>
    </li>
  )
}

function Satellites({ satellites }: { satellites: GpsSatellite[] }) {
  if (satellites.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        The receiver reports no satellites in view.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {groupSatellites(satellites).map((group) => (
        <section key={group.constellation} aria-label={group.label} className="flex flex-col gap-2">
          <h3 className="text-muted px-1 text-xs font-medium tracking-wide uppercase">
            {group.label}
          </h3>
          <ul className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border">
            {group.satellites.map((sat) => (
              <SatelliteRow key={sat.prn} sat={sat} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/**
 * Settings › Devices › GPS: the receiver's state and, below it, the signal of every satellite it
 * sees. Read-only: the GPS entity has no command topics. There is one receiver per van, so the
 * first record whose unconditional fields have arrived is the one shown.
 */
export function GpsView() {
  const { gps } = useSettings()
  const id = Object.keys(gps).find((key) => isCompleteGps(gps[key]))
  const record: Gps | undefined = id === undefined ? undefined : (gps[id] as Gps)

  if (record === undefined) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        No GPS data yet. Waiting for driver-gps to publish.
      </p>
    )
  }

  const { satellites } = record
  return (
    <div className="flex flex-col gap-3">
      <DetailList label="GPS status">
        <DetailRow label="Fix" value={fixLabel(record.fix_quality)} />
        <DetailRow
          label="Satellites"
          value={
            satellites === undefined
              ? `${record.satellites_in_use} in use`
              : `${record.satellites_in_use} in use, ${satellites.length} in view`
          }
        />
        <DetailRow label="Average signal" value={reading(record.avg_snr_db, 1, 'dB-Hz')} />
        <DetailRow label="HDOP" value={reading(record.hdop, 1)} />
        <DetailRow label="Altitude" value={reading(record.altitude_m, 0, 'm')} />
        <DetailRow label="Speed" value={reading(record.speed_kmh, 0, 'km/h')} />
        <DetailRow label="Fix time" value={formatFixTime(record.fix_time)} />
      </DetailList>
      <section aria-label="Satellite signal" className="flex flex-col gap-2">
        <h2 className="text-muted px-1 text-xs font-medium tracking-wide uppercase">
          Satellite signal
          {satellites !== undefined && satellites.length > 0 && (
            <span className="ml-2 normal-case">{trackedCount(satellites)} receiving</span>
          )}
        </h2>
        {satellites === undefined ? (
          <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
            Waiting for the receiver to report satellites.
          </p>
        ) : (
          <Satellites satellites={satellites} />
        )}
      </section>
    </div>
  )
}
