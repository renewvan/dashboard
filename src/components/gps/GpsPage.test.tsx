import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Gps } from '@/types'
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
  Marker: ({ position }: { position: [number, number] }) => (
    <div data-testid="marker" data-position={position.join(',')} />
  ),
}))
vi.mock('@/lib/leafletIconFix', () => ({}))

const FIX: Gps = {
  fix_quality: 'gps',
  satellites_in_use: 9,
  latitude: 51.5,
  longitude: -0.12,
  speed_kmh: 62.4,
}

function renderPage(gps: Record<string, Partial<Gps>>) {
  return render(<GpsPage gps={gps as Record<string, Gps>} />)
}

afterEach(cleanup)

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
})
