import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'
import type { Gps, GpsSatellite } from '@/types'

const sat = (
  constellation: GpsSatellite['constellation'],
  prn: number,
  snr_db: number | null,
): GpsSatellite => ({ constellation, prn, snr_db, elevation_deg: 30, azimuth_deg: 100 })

const FIX: Gps = {
  fix_quality: 'gps',
  satellites_in_use: 9,
  avg_snr_db: 39.2,
  hdop: 0.9,
  altitude_m: 122.3,
  speed_kmh: 41,
  fix_time: '2026-10-16T08:01:30+00:00',
  latitude: 47.9955,
  longitude: 7.8529,
  satellites: [
    sat('gps', 10, 38),
    sat('gps', 15, 44),
    sat('glonass', 65, 22),
    sat('beidou', 9, null),
  ],
}

/** Opens Settings › Devices › GPS: Devices list, the GPS Driver row, then its GPS entity row. */
async function openGps(gps: Record<string, Partial<Gps>>) {
  const rendered = renderSettings({}, { bus: { gps: gps as never } })
  await rendered.user.click(screen.getByRole('button', { name: /^Devices/ }))
  await rendered.user.click(screen.getByRole('button', { name: /^GPS/ }))
  await rendered.user.click(
    within(screen.getByRole('list', { name: 'Entities' })).getByRole('button', { name: /^GPS/ }),
  )
  return rendered
}

/** The value shown beside a status row's label. */
const row = (label: string) =>
  screen.getByText(label, { selector: 'dt' }).parentElement?.querySelector('dd')?.textContent

describe('Settings › Devices › GPS', () => {
  it('shows the receiver state with the units a driver publishes', async () => {
    await openGps({ van: FIX })

    expect(row('Fix')).toBe('GPS fix')
    expect(row('Satellites')).toBe('9 in use, 4 in view')
    expect(row('Average signal')).toBe('39.2 dB-Hz')
    expect(row('HDOP')).toBe('0.9')
    expect(row('Altitude')).toBe('122 m')
    expect(row('Speed')).toBe('41 km/h')
    expect(row('Fix time')).toBe('2026-10-16 08:01:30 UTC')
  })

  it('charts every satellite under its constellation, strongest first, with the signal in words', async () => {
    await openGps({ van: FIX })

    const signal = screen.getByRole('region', { name: 'Satellite signal' })
    const gpsGroup = within(within(signal).getByRole('region', { name: 'GPS' }))
    expect(gpsGroup.getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual([
      'GPS 15, 44 dB-Hz, strong',
      'GPS 10, 38 dB-Hz, good',
    ])
    expect(screen.getByRole('listitem', { name: 'GLONASS 65, 22 dB-Hz, fair' })).toBeInTheDocument()
  })

  it('shows a satellite with no measurement as such, not as a weak signal', async () => {
    await openGps({ van: FIX })

    const unmeasured = screen.getByRole('listitem', {
      name: 'BeiDou 9, No signal, not measured yet',
    })
    expect(within(unmeasured).getByTestId('signal-bar')).toHaveStyle({ height: '0%' })
    // 3 of the 4 listed satellites carry a measurement.
    expect(screen.getByText('3 receiving')).toBeInTheDocument()
  })

  it('draws each bar as a share of the 50 dB-Hz scale', async () => {
    await openGps({ van: FIX })

    const bar = (name: string) =>
      within(screen.getByRole('listitem', { name })).getByTestId('signal-bar')
    expect(bar('GPS 15, 44 dB-Hz, strong')).toHaveStyle({ height: '88%' })
    expect(bar('GLONASS 65, 22 dB-Hz, fair')).toHaveStyle({ height: '44%' })
  })

  it('still lists satellites when there is no fix, with position rows left as dashes', async () => {
    await openGps({
      van: {
        fix_quality: 'no_fix',
        satellites_in_use: 0,
        satellites: [sat('gps', 7, 18)],
      },
    })

    const row = (label: string) =>
      screen.getByText(label, { selector: 'dt' }).parentElement?.querySelector('dd')?.textContent
    expect(row('Fix')).toBe('No fix')
    expect(row('Satellites')).toBe('0 in use, 1 in view')
    expect(row('Altitude')).toBe('—')
    expect(row('Fix time')).toBe('—')
    expect(screen.getByRole('listitem', { name: 'GPS 7, 18 dB-Hz, poor' })).toBeInTheDocument()
  })

  it('says the receiver sees nothing when it reports an empty sky', async () => {
    await openGps({ van: { fix_quality: 'no_fix', satellites_in_use: 0, satellites: [] } })

    expect(screen.getByText('The receiver reports no satellites in view.')).toBeInTheDocument()
  })

  it('waits for a driver that does not publish satellites yet, without hiding the status', async () => {
    await openGps({ van: { fix_quality: 'gps', satellites_in_use: 5, avg_snr_db: 31 } })

    expect(screen.getByText('Waiting for the receiver to report satellites.')).toBeInTheDocument()
    expect(screen.getByText('5 in use')).toBeInTheDocument()
    expect(screen.queryByText(/receiving/)).not.toBeInTheDocument()
  })
})
