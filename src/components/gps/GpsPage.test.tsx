import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Gps, Tilt } from '@/types'
import { GpsPage } from './GpsPage'

// Leaflet needs real layout and tile loading; jsdom has neither. The page's own logic is
// which state it shows and what the readout says, so the map is reduced to its inputs.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ center, children }: { center: [number, number]; children: ReactNode }) => (
    <div data-testid="map" data-center={center.join(',')}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  Marker: ({
    position,
    icon,
  }: {
    position: [number, number]
    icon: { options: { html?: string } }
  }) => (
    <div
      data-testid="marker"
      data-position={position.join(',')}
      // The van's mirror and pitch live in the icon's HTML; expose it so a test can read them.
      data-html={icon.options.html}
    />
  ),
}))
vi.mock('@/lib/leafletIconFix', () => ({}))
vi.mock('leaflet', () => ({
  default: { divIcon: (options: object) => ({ options }) },
}))

const FIX: Gps = {
  fix_quality: 'gps',
  satellites_in_use: 9,
  latitude: 51.5,
  longitude: -0.12,
  speed_kmh: 62.4,
}

function renderPage(gps: Record<string, Partial<Gps>>, tilt: Record<string, Partial<Tilt>> = {}) {
  return render(<GpsPage gps={gps as Record<string, Gps>} tilt={tilt} />)
}

const fetchMock = vi.fn()

// The page asks Nominatim where the van is; no test may reach the network. By default the lookup
// finds nothing, so a test that does not care about the place name sees the readout without it.
beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('GpsPage', () => {
  it('asks for data when no GPS record has arrived', () => {
    renderPage({})
    expect(screen.getByRole('heading', { name: 'No GPS data yet.' })).toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('treats a record still missing its unconditional fields as no data', () => {
    renderPage({ gps0: { latitude: 51.5, longitude: -0.12 } })
    expect(screen.getByRole('heading', { name: 'No GPS data yet.' })).toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('reports the satellites being tracked while there is no fix, and draws no map', () => {
    renderPage({ gps0: { fix_quality: 'no_fix', satellites_in_use: 3 } })
    expect(screen.getByRole('heading', { name: 'No GPS fix yet' })).toBeInTheDocument()
    expect(screen.getByText('Tracking 3 satellite(s) — waiting for a fix.')).toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('does not plot a fix that is missing a coordinate', () => {
    renderPage({ gps0: { fix_quality: 'gps', satellites_in_use: 5, latitude: 51.5 } })
    expect(screen.getByRole('heading', { name: 'No GPS fix yet' })).toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('centres the map and the marker on the fix', () => {
    renderPage({ gps0: FIX })
    expect(screen.getByTestId('map')).toHaveAttribute('data-center', '51.5,-0.12')
    expect(screen.getByTestId('marker')).toHaveAttribute('data-position', '51.5,-0.12')
  })

  it('reads out the fix quality, satellites and rounded speed', () => {
    renderPage({ gps0: FIX })
    const readout = screen.getByTestId('gps-readout')
    expect(readout).toHaveTextContent('GPS')
    expect(readout).toHaveTextContent('9')
    expect(readout).toHaveTextContent('62 km/h')
  })

  it('omits the speed when the fix carries none', () => {
    renderPage({ gps0: { ...FIX, speed_kmh: undefined } })
    expect(screen.getByTestId('gps-readout')).not.toHaveTextContent('km/h')
  })

  it('shows 0 km/h for a standstill rather than hiding the speed', () => {
    renderPage({ gps0: { ...FIX, speed_kmh: 0 } })
    expect(screen.getByTestId('gps-readout')).toHaveTextContent('0 km/h')
  })

  it('skips an incomplete record and plots the first complete one', () => {
    renderPage({ a: { latitude: 1, longitude: 2 }, b: FIX })
    expect(screen.getByTestId('map')).toHaveAttribute('data-center', '51.5,-0.12')
  })

  describe('van marker', () => {
    const MOVING = { ...FIX, speed_kmh: 60 }
    const html = () => screen.getByTestId('marker').getAttribute('data-html') ?? ''

    it('faces right and shows the bearing while heading east', () => {
      renderPage({ gps0: { ...MOVING, course_deg: 90 } })
      expect(html()).not.toContain('scaleX(-1)')
      expect(screen.getByTestId('gps-heading')).toHaveTextContent('E 90°')
    })

    it('mirrors to face left while heading west', () => {
      renderPage({ gps0: { ...MOVING, course_deg: 270 } })
      expect(html()).toContain('scaleX(-1)')
      expect(screen.getByTestId('gps-heading')).toHaveTextContent('W 270°')
    })

    it('shows no heading at a standstill, where the course is stale', () => {
      renderPage({ gps0: { ...FIX, speed_kmh: 0, course_deg: 270 } })
      expect(screen.queryByTestId('gps-heading')).not.toBeInTheDocument()
      expect(html()).not.toContain('scaleX(-1)')
    })

    it('pitches the van with the tilt device', () => {
      renderPage({ gps0: MOVING }, { tilt: { roll_deg: 0, pitch_deg: 4, status: 'ok' } })
      expect(html()).toContain('rotate(4deg)')
    })

    it('stays level when the tilt sensor errors, ignoring its stale retained angles', () => {
      renderPage({ gps0: MOVING }, { tilt: { roll_deg: 0, pitch_deg: 4, status: 'sensor_error' } })
      expect(html()).toContain('rotate(0deg)')
    })
  })

  describe('place name', () => {
    const answer = (body: unknown, ok = true) =>
      fetchMock.mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body })

    it('names the place the van is in, looked up at the fix', async () => {
      answer({ address: { town: 'Hastings' }, display_name: 'Hastings, England' })
      renderPage({ gps0: FIX })
      expect(await screen.findByTestId('gps-place')).toHaveTextContent('Hastings')
      expect(String(fetchMock.mock.calls[0][0])).toContain('lat=51.5&lon=-0.12')
    })

    it('shows no place line when the service has no answer for the spot', async () => {
      answer({ error: 'Unable to geocode' })
      renderPage({ gps0: FIX })
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(screen.queryByTestId('gps-place')).not.toBeInTheDocument()
      expect(screen.getByTestId('gps-readout')).toHaveTextContent('62 km/h')
    })

    it('keeps the rest of the readout when the lookup fails', async () => {
      fetchMock.mockRejectedValue(new Error('offline'))
      renderPage({ gps0: FIX })
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(screen.queryByTestId('gps-place')).not.toBeInTheDocument()
      expect(screen.getByTestId('gps-readout')).toHaveTextContent('62 km/h')
    })

    it('does not look anything up while there is no fix to look up', () => {
      renderPage({ gps0: { fix_quality: 'no_fix', satellites_in_use: 3 } })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('looks up once per ~110 m cell, not for every jittering fix', async () => {
      answer({ address: { town: 'Hastings' } })
      const { rerender } = renderPage({ gps0: FIX })
      await screen.findByTestId('gps-place')
      rerender(<GpsPage gps={{ gps0: { ...FIX, latitude: 51.50031, longitude: -0.12012 } }} />)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      rerender(<GpsPage gps={{ gps0: { ...FIX, latitude: 51.52, longitude: -0.12 } }} />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    })
  })
})
