import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import type { Gps, Tilt } from '@/types'
import { MapPage } from './MapPage'

// The map's zoom methods, shared so a test can tell which one a button called, every style the
// map is handed, in order, so a test can tell which flavor it got and whether it was rebuilt, and
// the map's event callbacks, so a test can fire the events MapLibre would.
const map = vi.hoisted(() => ({
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  styles: [] as { sprite?: string; layers: unknown[] }[],
  /** What the page handed the map as its attribution control: `false` is none, `undefined` is unset. */
  attributionControl: undefined as undefined | false | object,
  onError: undefined as undefined | ((e: unknown) => void),
  onSourceData: undefined as undefined | ((e: unknown) => void),
}))

// MapLibre needs WebGL, real layout and tile loading; jsdom has none. The page's own logic is which
// state it shows and what the readout says, so the map is reduced to its inputs. The Marker keeps
// its React children, so the van's mirror and pitch stay real DOM a test can read.
vi.mock('react-map-gl/maplibre', () => ({
  Map: ({
    initialViewState,
    mapStyle,
    onError,
    onSourceData,
    children,
    attributionControl,
  }: {
    initialViewState: { longitude: number; latitude: number }
    mapStyle: { sprite?: string; layers: unknown[] }
    onError?: (e: unknown) => void
    onSourceData?: (e: unknown) => void
    attributionControl?: false | object
    children: ReactNode
  }) => {
    map.styles.push(mapStyle)
    map.attributionControl = attributionControl
    map.onError = onError
    map.onSourceData = onSourceData
    return (
      <div
        data-testid="map"
        data-center={`${initialViewState.latitude},${initialViewState.longitude}`}
      >
        <div className="maplibregl-ctrl maplibregl-ctrl-attrib" />
        {children}
      </div>
    )
  },
  Marker: ({
    longitude,
    latitude,
    children,
  }: {
    longitude: number
    latitude: number
    children: ReactNode
  }) => (
    <div data-testid="marker" data-position={`${latitude},${longitude}`}>
      {children}
    </div>
  ),
  useMap: () => ({ current: map }),
}))
vi.mock('maplibre-gl', () => ({
  addProtocol: vi.fn(),
  removeProtocol: vi.fn(),
  setWorkerUrl: vi.fn(),
}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?url', () => ({ default: '/worker.mjs' }))

const FIX: Gps = {
  fix_quality: 'gps',
  satellites_in_use: 9,
  latitude: 51.5,
  longitude: -0.12,
  speed_kmh: 62.4,
}

function renderPage(gps: Record<string, Partial<Gps>>, tilt: Record<string, Partial<Tilt>> = {}) {
  return render(<MapPage gps={gps as Record<string, Gps>} tilt={tilt} />)
}

const fetchMock = vi.fn()
const KIOSK_WIDTH = 800
let viewport: MatchMediaStub

// The page asks Nominatim where the van is; no test may reach the network. By default the lookup
// finds nothing, so a test that does not care about the place name sees the readout without it.
beforeEach(() => {
  viewport = stubMatchMedia(KIOSK_WIDTH)
  fetchMock.mockReset()
  map.zoomIn.mockReset()
  map.zoomOut.mockReset()
  map.styles.length = 0
  map.onError = undefined
  map.onSourceData = undefined
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  viewport.restore()
})

describe('MapPage zoom buttons', () => {
  // The wheel is off and a gloved finger or a mouse cannot pinch, so these are the only way to zoom
  // there; the map under them is mocked, so what matters is which zoom each one asks for.
  it('zooms the map in and out, one step per press', async () => {
    const user = userEvent.setup()
    renderPage({ gps0: FIX })

    await user.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(map.zoomIn).toHaveBeenCalledTimes(1)
    expect(map.zoomOut).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(map.zoomOut).toHaveBeenCalledTimes(1)
    expect(map.zoomIn).toHaveBeenCalledTimes(1)
  })

  it('offers no zoom with no map to zoom: before the first fix', () => {
    renderPage({})
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zoom out' })).not.toBeInTheDocument()
  })
})

describe('MapPage attribution and readout', () => {
  const JUST_BELOW_KIOSK_WIDTH = 799

  /** MapLibre's (i): its own control, which opens itself a moment after it is added, as the real one does. */
  const control = () => document.querySelector('.maplibregl-ctrl-attrib') as HTMLElement
  const maplibreOpens = async () => {
    await act(async () => {
      control().classList.add('maplibregl-compact', 'maplibregl-compact-show')
    })
  }
  const userToggles = async () => {
    await act(async () => {
      control().classList.toggle('maplibregl-compact-show')
    })
  }

  it('asks MapLibre for the round (i) on every size: a compact attribution control', () => {
    renderPage({ gps0: FIX })
    expect(map.attributionControl).toEqual({ compact: true })

    cleanup()
    viewport.setViewportWidth(JUST_BELOW_KIOSK_WIDTH)
    renderPage({ gps0: FIX })
    expect(map.attributionControl).toEqual({ compact: true })
  })

  it('starts the (i) closed: it takes the open state off the first time MapLibre adds it', async () => {
    renderPage({ gps0: FIX })

    await maplibreOpens()

    expect(control()).not.toHaveClass('maplibregl-compact-show')
  })

  it('leaves the (i) to the user after that: a tap opens it and it stays open', async () => {
    renderPage({ gps0: FIX })
    await maplibreOpens()

    await userToggles()

    expect(control()).toHaveClass('maplibregl-compact-show')
  })

  it('keeps the kiosk readout whole, with the (i) open or closed', async () => {
    renderPage({ gps0: FIX })
    await maplibreOpens()
    await userToggles()

    const readout = screen.getByTestId('map-readout')
    expect(readout).toHaveTextContent('62 km/h')
    expect(readout).toHaveTextContent('9')
  })

  describe('on a phone', () => {
    beforeEach(() => {
      viewport.setViewportWidth(JUST_BELOW_KIOSK_WIDTH)
    })

    it('shows the whole readout while the (i) is closed', async () => {
      renderPage({ gps0: { ...FIX, course_deg: 90 } })
      await maplibreOpens()

      const readout = screen.getByTestId('map-readout')
      expect(readout).toHaveTextContent('62 km/h')
      expect(screen.getByLabelText('Satellites in use')).toHaveTextContent('9')
      expect(screen.getByTestId('map-heading')).toBeInTheDocument()
    })

    it('shrinks the readout to the pin while the (i) is open, and restores it on close', async () => {
      renderPage({ gps0: FIX })
      await maplibreOpens()

      await userToggles()
      const pin = screen.getByTestId('map-readout')
      expect(pin).not.toHaveTextContent('km/h')
      expect(pin).toHaveAccessibleName('GPS fix')

      await userToggles()
      expect(screen.getByTestId('map-readout')).toHaveTextContent('62 km/h')
    })
  })
})

describe('MapPage theme', () => {
  const sprite = () => map.styles.at(-1)?.sprite ?? ''
  const withTheme = (gps: Record<string, Partial<Gps>>, isDark?: boolean) => (
    <MapPage gps={gps as Record<string, Gps>} isDark={isDark} />
  )

  it('draws the dark map by default, as the app does', () => {
    render(withTheme({ gps0: FIX }))
    expect(sprite()).toMatch(/\/sprites\/v4\/dark$/)
  })

  it('draws the light map under the light theme and the dark one under the dark theme', () => {
    const light = render(withTheme({ gps0: FIX }, false))
    expect(sprite()).toMatch(/\/sprites\/v4\/light$/)
    light.unmount()

    render(withTheme({ gps0: FIX }, true))
    expect(sprite()).toMatch(/\/sprites\/v4\/dark$/)
  })

  it('repaints in the other flavor when the theme is toggled, keeping the van where it is', () => {
    const { rerender } = render(withTheme({ gps0: FIX }, true))
    const dark = map.styles.at(-1)

    rerender(withTheme({ gps0: FIX }, false))

    expect(sprite()).toMatch(/\/sprites\/v4\/light$/)
    // A different style object, so MapLibre swaps it; and different layer colours, not just a path.
    expect(map.styles.at(-1)).not.toBe(dark)
    expect(JSON.stringify(map.styles.at(-1)?.layers)).not.toBe(JSON.stringify(dark?.layers))
    expect(screen.getByTestId('marker')).toHaveAttribute('data-position', '51.5,-0.12')
  })

  it('keeps the same style object while the van moves, so the tiles are not reloaded', () => {
    const { rerender } = render(withTheme({ gps0: FIX }, true))
    const first = map.styles.at(-1)

    rerender(withTheme({ gps0: { ...FIX, latitude: 51.6, speed_kmh: 80 } }, true))

    expect(screen.getByTestId('marker')).toHaveAttribute('data-position', '51.6,-0.12')
    // A new style object on every GPS message would make MapLibre reload the whole basemap.
    expect(map.styles.at(-1)).toBe(first)
  })
})

describe('MapPage', () => {
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
    const readout = screen.getByTestId('map-readout')
    expect(readout).toHaveTextContent('GPS')
    expect(readout).toHaveTextContent('9')
    expect(readout).toHaveTextContent('62 km/h')
  })

  it('omits the speed when the fix carries none', () => {
    renderPage({ gps0: { ...FIX, speed_kmh: undefined } })
    expect(screen.getByTestId('map-readout')).not.toHaveTextContent('km/h')
  })

  it('shows 0 km/h for a standstill rather than hiding the speed', () => {
    renderPage({ gps0: { ...FIX, speed_kmh: 0 } })
    expect(screen.getByTestId('map-readout')).toHaveTextContent('0 km/h')
  })

  it('skips an incomplete record and plots the first complete one', () => {
    renderPage({ a: { latitude: 1, longitude: 2 }, b: FIX })
    expect(screen.getByTestId('map')).toHaveAttribute('data-center', '51.5,-0.12')
  })

  describe('van marker', () => {
    const MOVING = { ...FIX, speed_kmh: 60 }
    // The van is the marker's one wrapper (`van-marker`); its mirror is that element's transform
    // and its pitch the SVG inside it.
    const van = () => screen.getByTestId('van-marker')
    const mirror = () => van().style.transform
    const pitch = () => van().querySelector('svg')?.style.transform ?? ''

    it('faces right and shows the bearing while heading east', () => {
      renderPage({ gps0: { ...MOVING, course_deg: 90 } })
      expect(mirror()).not.toContain('scaleX(-1)')
      expect(screen.getByTestId('map-heading')).toHaveTextContent('E 90°')
    })

    it('mirrors to face left while heading west', () => {
      renderPage({ gps0: { ...MOVING, course_deg: 270 } })
      expect(mirror()).toContain('scaleX(-1)')
      expect(screen.getByTestId('map-heading')).toHaveTextContent('W 270°')
    })

    it('shows no heading at a standstill, where the course is stale', () => {
      renderPage({ gps0: { ...FIX, speed_kmh: 0, course_deg: 270 } })
      expect(screen.queryByTestId('map-heading')).not.toBeInTheDocument()
      expect(mirror()).not.toContain('scaleX(-1)')
    })

    it('pitches the van with the tilt device', () => {
      renderPage({ gps0: MOVING }, { tilt: { roll_deg: 0, pitch_deg: 4, status: 'ok' } })
      expect(pitch()).toContain('rotate(4deg)')
    })

    it('stays level when the tilt sensor errors, ignoring its stale retained angles', () => {
      renderPage({ gps0: MOVING }, { tilt: { roll_deg: 0, pitch_deg: 4, status: 'sensor_error' } })
      expect(pitch()).toContain('rotate(0deg)')
    })
  })

  describe('place name', () => {
    const answer = (body: unknown, ok = true) =>
      fetchMock.mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body })

    it('names the place the van is in, looked up at the fix', async () => {
      answer({ address: { town: 'Hastings' }, display_name: 'Hastings, England' })
      renderPage({ gps0: FIX })
      expect(await screen.findByTestId('map-place')).toHaveTextContent('Hastings')
      expect(String(fetchMock.mock.calls[0][0])).toContain('lat=51.5&lon=-0.12')
    })

    it('shows no place line when the service has no answer for the spot', async () => {
      answer({ error: 'Unable to geocode' })
      renderPage({ gps0: FIX })
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(screen.queryByTestId('map-place')).not.toBeInTheDocument()
      expect(screen.getByTestId('map-readout')).toHaveTextContent('62 km/h')
    })

    it('keeps the rest of the readout when the lookup fails', async () => {
      fetchMock.mockRejectedValue(new Error('offline'))
      renderPage({ gps0: FIX })
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(screen.queryByTestId('map-place')).not.toBeInTheDocument()
      expect(screen.getByTestId('map-readout')).toHaveTextContent('62 km/h')
    })

    it('does not look anything up while there is no fix to look up', () => {
      renderPage({ gps0: { fix_quality: 'no_fix', satellites_in_use: 3 } })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('looks up once per ~110 m cell, not for every jittering fix', async () => {
      answer({ address: { town: 'Hastings' } })
      const { rerender } = renderPage({ gps0: FIX })
      await screen.findByTestId('map-place')
      rerender(<MapPage gps={{ gps0: { ...FIX, latitude: 51.50031, longitude: -0.12012 } }} />)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      rerender(<MapPage gps={{ gps0: { ...FIX, latitude: 51.52, longitude: -0.12 } }} />)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    })
  })
})

describe('MapPage basemap notice', () => {
  // What MapLibre fires on the map for a failure of the basemap file: the source itself failed to
  // load (pmtiles could not read the header), so the event names the source and carries no tile.
  const sourceError = (sourceId = 'protomaps') => ({
    error: new Error('Bad response code: 404'),
    sourceId,
  })
  // A tile of the source failed to load: the event names the source and the tile.
  const tileError = () => ({ error: new Error('boom'), sourceId: 'protomaps', tile: {} })
  const fire = (callback: ((e: unknown) => void) | undefined, event: unknown) =>
    act(() => callback?.(event))
  const notice = () => screen.queryByTestId('map-notice')

  beforeEach(() => {
    // The map's errors are logged, as react-map-gl would have; a test has no use for the noise.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows no notice while the basemap is fine', () => {
    renderPage({ gps0: FIX })
    expect(notice()).not.toBeInTheDocument()
  })

  it('says the offline map is unavailable when the basemap file cannot be read, keeping the map and the van', () => {
    renderPage({ gps0: FIX })
    fire(map.onError, sourceError())
    expect(notice()).toHaveTextContent('Offline map unavailable')
    expect(notice()).toHaveTextContent('docs/offline-map.md')
    expect(screen.getByTestId('map')).toBeInTheDocument()
    expect(screen.getByTestId('marker')).toBeInTheDocument()
    expect(screen.getByTestId('map-readout')).toBeInTheDocument()
  })

  it('stays quiet when only a tile fails, as when the van is outside the extract', () => {
    renderPage({ gps0: FIX })
    fire(map.onError, tileError())
    expect(notice()).not.toBeInTheDocument()
  })

  it('ignores an error from some other source or from the map itself', () => {
    renderPage({ gps0: FIX })
    fire(map.onError, sourceError('elsewhere'))
    fire(map.onError, { error: new Error('Worker failed to load') })
    expect(notice()).not.toBeInTheDocument()
  })

  it('still logs every map error, as react-map-gl would have without a handler', () => {
    renderPage({ gps0: FIX })
    const event = tileError()
    fire(map.onError, event)
    expect(console.error).toHaveBeenCalledWith(event.error)
  })

  it('keeps the notice as the van moves', () => {
    const { rerender } = renderPage({ gps0: FIX })
    fire(map.onError, sourceError())
    rerender(<MapPage gps={{ gps0: { ...FIX, latitude: 51.6 } }} />)
    expect(notice()).toBeInTheDocument()
  })

  it('takes the notice away once the basemap source loads', () => {
    renderPage({ gps0: FIX })
    fire(map.onError, sourceError())
    fire(map.onSourceData, { sourceId: 'protomaps', sourceDataType: 'content' })
    expect(notice()).not.toBeInTheDocument()
  })

  it('keeps the notice through source events that are not a load of the basemap', () => {
    renderPage({ gps0: FIX })
    fire(map.onError, sourceError())
    fire(map.onSourceData, { sourceId: 'elsewhere', sourceDataType: 'content' })
    fire(map.onSourceData, { sourceId: 'protomaps', sourceDataType: 'metadata' })
    expect(notice()).toBeInTheDocument()
  })

  it('shows no notice before a fix, where there is no map to be empty', () => {
    renderPage({ gps0: { fix_quality: 'no_fix', satellites_in_use: 3 } })
    expect(map.onError).toBeUndefined()
    expect(notice()).not.toBeInTheDocument()
  })
})
