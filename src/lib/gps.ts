import type { Gps, GpsConstellation, GpsFixQuality, GpsSatellite } from '@/types'

/** Full scale of a satellite's signal bar, dB-Hz. Open-sky receivers top out in the high 40s. */
export const SNR_FULL_SCALE_DB = 50

export type SignalQuality = 'none' | 'poor' | 'fair' | 'good' | 'strong'

/**
 * How a satellite's C/N0 reads. Below ~20 dB-Hz a receiver cannot use a satellite for a fix,
 * 20-30 is marginal, 30-40 is a solid signal and 40+ is strong. `null` is a satellite the
 * receiver knows of but is not measuring yet, which is not the same as a weak one.
 */
export function signalQuality(snr: number | null): SignalQuality {
  if (snr === null) return 'none'
  if (snr < 20) return 'poor'
  if (snr < 30) return 'fair'
  if (snr < 40) return 'good'
  return 'strong'
}

/** A satellite's bar fill as a 0-1 fraction of the full scale; `null` (no measurement) is empty. */
export function signalFraction(snr: number | null): number {
  if (snr === null) return 0
  return Math.min(1, Math.max(0, snr / SNR_FULL_SCALE_DB))
}

export const CONSTELLATION_LABELS: Record<GpsConstellation, string> = {
  gps: 'GPS',
  glonass: 'GLONASS',
  galileo: 'Galileo',
  beidou: 'BeiDou',
  qzss: 'QZSS',
  other: 'Other',
}

/** The order constellations are listed in; `other` always last. */
const CONSTELLATION_ORDER: GpsConstellation[] = [
  'gps',
  'glonass',
  'galileo',
  'beidou',
  'qzss',
  'other',
]

export interface ConstellationGroup {
  constellation: GpsConstellation
  label: string
  satellites: GpsSatellite[]
}

/**
 * The satellites in view, grouped by constellation in a fixed order and, inside a group, strongest
 * signal first with the unmeasured ones last (then by PRN, so equal signals never reshuffle between
 * messages). Constellations with no satellite are left out. Never mutates `satellites`.
 */
export function groupSatellites(satellites: readonly GpsSatellite[]): ConstellationGroup[] {
  return CONSTELLATION_ORDER.flatMap((constellation) => {
    const members = satellites
      .filter((sat) => sat.constellation === constellation)
      .toSorted((a, b) => {
        if (a.snr_db === null && b.snr_db === null) return a.prn - b.prn
        if (a.snr_db === null) return 1
        if (b.snr_db === null) return -1
        return b.snr_db - a.snr_db || a.prn - b.prn
      })
    return members.length === 0
      ? []
      : [{ constellation, label: CONSTELLATION_LABELS[constellation], satellites: members }]
  })
}

/** How many satellites carry a measurement, i.e. are actually being received. */
export function trackedCount(satellites: readonly GpsSatellite[]): number {
  return satellites.filter((sat) => sat.snr_db !== null).length
}

const FIX_LABELS: Record<GpsFixQuality, string> = {
  no_fix: 'No fix',
  gps: 'GPS fix',
  dgps: 'DGPS fix',
  pps: 'PPS fix',
  rtk: 'RTK fix',
  float_rtk: 'Float RTK fix',
  estimated: 'Estimated',
  manual: 'Manual',
  simulation: 'Simulation',
}

export function fixLabel(quality: GpsFixQuality): string {
  return FIX_LABELS[quality]
}

/** A satellite's name in the list, e.g. `GLONASS 65`: PRNs are only unique within a constellation. */
export function satelliteName(sat: GpsSatellite): string {
  return `${CONSTELLATION_LABELS[sat.constellation]} ${sat.prn}`
}

/** The signal as text, so a bar's value never rests on its colour alone. */
export function formatSnr(snr: number | null): string {
  return snr === null ? 'No signal' : `${Math.round(snr)} dB-Hz`
}

/** Headline for the Driver page's GPS row, e.g. `9 satellites in use` or `No fix, 5 in view`. */
export function gpsSummary(gps: Partial<Gps> | undefined): string {
  if (!gps || gps.fix_quality === undefined) return 'No data yet'
  if (gps.fix_quality === 'no_fix') {
    const inView = gps.satellites?.length
    return inView === undefined ? 'No fix' : `No fix, ${inView} in view`
  }
  return `${gps.satellites_in_use ?? 0} satellites in use`
}
