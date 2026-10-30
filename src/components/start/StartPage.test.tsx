import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import type { Battery, Charger, Gps, Solar, Tank, TemperatureSensor, Tilt } from '@/types'
import type { PowerLayout } from '@/hooks/usePowerLayout'
import type { StartWidgetId } from '@/hooks/useStartLayout'
import type { StartTiles } from '@/hooks/useStartTiles'
import type { StartView } from '@/hooks/useStartView'
import { DEFAULT_START_POWER_SOURCES, type StartPowerSources } from '@/hooks/useStartPowerSources'
import { EntityIconsContext } from '@/hooks/useEntityIcon'
import { StartPage } from './StartPage'

// `findBy` for the lazy Map chunk: importing it can take longer than the default 1 s under load.
const LAZY_MAP_WAIT = { timeout: 5_000 }

// The Map card lazy-loads MapLibre, which needs WebGL jsdom does not have (and takes seconds to
// import). These tests are about where the card sits and what it is handed, not about drawing.
vi.mock('react-map-gl/maplibre', () => ({
  Map: ({
    initialViewState,
    mapStyle,
    children,
  }: {
    initialViewState: { longitude: number; latitude: number }
    mapStyle: { sprite?: string }
    children?: ReactNode
  }) => (
    <div
      data-testid="map"
      data-center={`${initialViewState.latitude},${initialViewState.longitude}`}
      data-sprite={mapStyle.sprite}
    >
      {children}
    </div>
  ),
  Marker: ({ children }: { children?: ReactNode }) => <div data-testid="marker">{children}</div>,
  useMap: () => ({ current: undefined }),
}))
vi.mock('maplibre-gl', () => ({
  addProtocol: vi.fn(),
  removeProtocol: vi.fn(),
  setWorkerUrl: vi.fn(),
}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?url', () => ({ default: '/worker.mjs' }))

const KIOSK_WIDTH = 800
const JUST_BELOW_KIOSK_WIDTH = 799

function tank(overrides: Partial<Tank> = {}): Tank {
  return {
    fluid_type: 'fresh_water',
    capacity_l: 100,
    level_pct: 46,
    status: 'ok',
    volume_since_full_l: 0,
    volume_since_empty_l: 0,
    ...overrides,
  }
}

const BATTERY: Battery = {
  soc_pct: 78,
  voltage_v: 13.2,
  current_a: -2.6,
  power_w: -35,
  temperature_c: 21,
  time_to_go_s: 9 * 86_400 + 23 * 3_600 + 30 * 60,
  charge_state: 'float',
}

let viewport: MatchMediaStub
const onConfigureTank = vi.fn()
function renderAt(
  width: number,
  props: {
    tanks?: Record<string, Partial<Tank>>
    batteries?: Record<string, Partial<Battery>>
    solar?: Record<string, Partial<Solar>>
    chargers?: Record<string, Partial<Charger>>
    temperatures?: Record<string, Partial<TemperatureSensor>>
    gps?: Record<string, Partial<Gps>>
    tilt?: Record<string, Partial<Tilt>>
    powerSources?: StartPowerSources
    powerLayout?: PowerLayout
    primaryBatterySelection?: string
    mapIsDark?: boolean
    layout?: readonly StartWidgetId[]
    view?: StartView
    tiles?: StartTiles
    onOpenInstance?: (key: string) => void
    entityIcons?: Record<string, string>
  },
) {
  viewport = stubMatchMedia(width)
  return render(
    <EntityIconsContext.Provider value={props.entityIcons ?? {}}>
      <StartPage
        tanks={props.tanks ?? {}}
        batteries={props.batteries ?? {}}
        primaryBatterySelection={props.primaryBatterySelection}
        solar={props.solar ?? {}}
        chargers={props.chargers ?? {}}
        temperatures={props.temperatures ?? {}}
        gps={props.gps ?? {}}
        tilt={props.tilt ?? {}}
        powerSources={props.powerSources ?? DEFAULT_START_POWER_SOURCES}
        powerLayout={props.powerLayout ?? 'tiles'}
        isDark
        mapIsDark={props.mapIsDark ?? true}
        layout={props.layout}
        view={props.view}
        tiles={props.tiles}
        onConfigureTank={onConfigureTank}
        onOpenInstance={props.onOpenInstance}
      />
    </EntityIconsContext.Provider>,
  )
}

const FORECAST = {
  current: { temperature_2m: 14.4, weather_code: 0 },
  daily: {
    time: ['2026-10-13', '2026-10-14', '2026-10-15'],
    weather_code: [0, 3, 61],
    temperature_2m_max: [18.2, 16.1, 12.7],
    temperature_2m_min: [9.4, 8.8, 7.1],
  },
}

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => FORECAST }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  onConfigureTank.mockClear()
  cleanup()
  vi.unstubAllGlobals()
  viewport.restore()
})

/** A dial subline whose unit letters sit in their own span, so match on the whole line's text. */
function subline(text: string) {
  return screen.getByText((_, el) => el?.tagName === 'DIV' && el.textContent === text)
}

describe.each([['phone', JUST_BELOW_KIOSK_WIDTH]])('StartPage (%s)', (_name, width) => {
  it('shows each tank as its Tanks-page card, litres and level included', () => {
    renderAt(width, {
      tanks: {
        fresh: tank(),
        grey: tank({ fluid_type: 'grey_water', capacity_l: 80, level_pct: 41 }),
      },
    })

    expect(screen.getByText('46%')).toBeInTheDocument()
    expect(screen.getByText(/46\/100/)).toBeInTheDocument()
    expect(screen.getByText('41%')).toBeInTheDocument()
    expect(screen.getByText(/33\/80/)).toBeInTheDocument()
  })

  it('draws the battery as the one cockpit dial, with its live reading', () => {
    renderAt(width, {
      tanks: {
        fresh: tank(),
        grey: tank({ fluid_type: 'grey_water', capacity_l: 80, level_pct: 41 }),
      },
      batteries: { house: BATTERY },
    })

    // The dial is the Energy carousel's second slide, so it is `aria-hidden` until swiped to.
    expect(screen.getByRole('img', { name: 'Battery 78%', hidden: true })).toBeInTheDocument()
    expect(subline('13.20V / 35W')).toBeInTheDocument()
    // Only the battery is a dial: the tanks are the Tanks page's own cards.
    expect(screen.getAllByRole('img', { name: /^Battery/, hidden: true })).toHaveLength(1)
  })

  it('reads the Primary battery: Auto is the first by id, a selection follows it', () => {
    const batteries = { b: { ...BATTERY, soc_pct: 40 }, a: { ...BATTERY, soc_pct: 78 } }
    const auto = renderAt(width, { batteries })
    expect(screen.getByRole('img', { name: 'Battery 78%', hidden: true })).toBeInTheDocument()
    auto.unmount()

    renderAt(width, { batteries, primaryBatterySelection: 'b' })
    expect(screen.getByRole('img', { name: 'Battery 40%', hidden: true })).toBeInTheDocument()
  })

  it('shows "No data yet" in the card of a reading whose data has not arrived', () => {
    renderAt(width, { tanks: { fresh: tank() } })

    expect(screen.getByText('46%')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /^Battery/, hidden: true })).not.toBeInTheDocument()
    // Power and Battery (the Energy carousel's two slides), then grey water: one each.
    expect(screen.getAllByText('No data yet', { exact: true })).toHaveLength(3)
  })

  it('does not draw anything from a half-arrived record', () => {
    renderAt(width, {
      tanks: { grey: { fluid_type: 'grey_water', capacity_l: 80 } },
      batteries: { house: { soc_pct: 78 } },
    })

    expect(screen.queryAllByRole('img', { hidden: true })).toHaveLength(0)
    // Power, Battery, fresh water and grey water: one "No data yet" each.
    expect(screen.getAllByText('No data yet')).toHaveLength(4)
  })

  it('shows a faulted tank as a fault, with its reason, not as a level', () => {
    renderAt(width, { tanks: { fresh: tank({ status: 'short_circuit', level_pct: 62 }) } })

    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByText('Short circuit')).toBeInTheDocument()
    expect(screen.queryByText(/\u2113/)).not.toBeInTheDocument()
  })

  it('opens the settings of the tank whose card is tapped', async () => {
    const user = userEvent.setup()
    renderAt(width, {
      tanks: { f1: tank(), g1: tank({ fluid_type: 'grey_water', capacity_l: 80, level_pct: 41 }) },
    })

    await user.click(screen.getByRole('button', { name: 'Grey water settings' }))
    expect(onConfigureTank).toHaveBeenCalledExactlyOnceWith('g1')
  })
})

describe('StartPage layout', () => {
  it('stacks the phone page as cards: weather, map (no title), energy, solar, tilt, fresh water, grey water', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {
      tanks: { fresh: tank(), grey: tank({ fluid_type: 'grey_water' }) },
      batteries: { house: BATTERY },
      solar: { 291: { power_w: 412, battery_voltage_v: 13.4, yield_today_wh: 2140 } },
    })
    const pane = screen.getByTestId('pane-start')
    const titles = [
      'Weather',
      'Energy',
      'Solar production',
      'Tilt',
      'Fresh water',
      'Grey water',
    ].map((title) =>
      within(pane).getByText(title, {
        selector: '[class*="card__header"], [class*="card__header"] *',
      }),
    )

    expect(pane.children).toHaveLength(7)
    // The map card has no title, so it is the one child without a heading: index 1.
    const cardIndex = [0, 2, 3, 4, 5, 6]
    titles.forEach((title, i) => expect(pane.children[cardIndex[i]]).toContainElement(title))
  })

  it('shows only the widgets in the layout, in the layout order', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, { layout: ['tilt', 'grey-water', 'weather'] })
    const pane = screen.getByTestId('pane-start')

    expect(pane.children).toHaveLength(3)
    expect(pane.children[0]).toHaveTextContent('Tilt')
    expect(pane.children[1]).toHaveTextContent('Grey water')
    expect(pane.children[2]).toHaveTextContent('Weather')
    expect(screen.queryByTestId('map-card-loading')).not.toBeInTheDocument()
  })

  it('draws an empty page when every widget is removed', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, { layout: [] })
    expect(screen.getByTestId('pane-start')).toBeEmptyDOMElement()
  })
})

describe('StartPage masonry view', () => {
  it('draws the tiles in layout order on a grid, the Map, Power and Battery taking more cells, with no Dial', () => {
    renderAt(KIOSK_WIDTH, { view: 'masonry', layout: ['tilt', 'map', 'energy', 'weather'] })
    const pane = screen.getByTestId('pane-start')

    // Energy is two tiles here, Power then Battery.
    expect(pane.children).toHaveLength(5)
    expect(pane.children[0]).toHaveTextContent('Tilt')
    expect(pane.children[1]).toHaveClass('col-span-2', 'row-span-2')
    expect(pane.children[2]).toHaveTextContent('Power')
    expect(pane.children[2]).toHaveClass('row-span-2')
    expect(pane.children[3]).toHaveTextContent('Battery')
    expect(pane.children[3]).toHaveClass('row-span-2')
    expect(pane.children[4]).toHaveTextContent('Weather')
    expect(pane.children[4]).not.toHaveClass('col-span-2', 'row-span-2')
    expect(screen.queryByRole('img', { name: /battery/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('carousel-track')).not.toBeInTheDocument()
  })

  it('draws a tile at the size the user chose, the rest at their shipped size', () => {
    renderAt(KIOSK_WIDTH, {
      view: 'masonry',
      layout: ['tilt', 'energy'],
      tiles: { battery: { cols: 1, rows: 1 }, tilt: { cols: 3, rows: 2 } },
    })
    const pane = screen.getByTestId('pane-start')

    expect(pane.children[0]).toHaveClass('col-span-3', 'row-span-2')
    expect(pane.children[1]).toHaveClass('row-span-2')
    expect(pane.children[2]).toHaveClass('col-span-1', 'row-span-1')
  })

  it('keeps Energy one carousel card for a phone, whatever the view is', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, { view: 'masonry', layout: ['tilt', 'energy'] })
    const pane = screen.getByTestId('pane-start')

    expect(pane.children).toHaveLength(2)
    expect(pane).not.toHaveClass('grid')
    expect(pane.children[1]).toHaveTextContent('Energy')
    expect(screen.getByTestId('carousel-track')).toBeInTheDocument()
  })

  it('keeps the Cockpit as the kiosk default', () => {
    renderAt(KIOSK_WIDTH, { layout: ['tilt'] })
    expect(screen.getByTestId('pane-start')).not.toHaveClass('grid')
    expect(screen.queryByText('Weather')).not.toBeInTheDocument()
  })
})

describe('StartPage dial BMS alert', () => {
  const faulty: Battery = { ...BATTERY, protections: ['short_circuit'] }

  it('puts a danger indicator on the dial that opens the Primary battery', async () => {
    const onOpenInstance = vi.fn()
    renderAt(KIOSK_WIDTH, { batteries: { house: faulty }, onOpenInstance })

    const alert = screen.getByRole('button', { name: /Battery protection active: Short circuit/ })
    expect(alert).toHaveAttribute('data-tone', 'danger')
    await userEvent.click(alert)
    expect(onOpenInstance).toHaveBeenCalledWith('battery:house')
  })

  it('is amber for an advisory protection', () => {
    renderAt(KIOSK_WIDTH, {
      batteries: { house: { ...BATTERY, protections: ['cell_imbalance'] } },
      onOpenInstance: vi.fn(),
    })
    expect(screen.getByRole('button', { name: /Battery protection active/ })).toHaveAttribute(
      'data-tone',
      'warning',
    )
  })

  it.each([undefined, []])('is not drawn while protections are %j', (protections) => {
    renderAt(KIOSK_WIDTH, { batteries: { house: { ...BATTERY, protections } } })
    expect(screen.queryByRole('button', { name: /Battery protection/ })).not.toBeInTheDocument()
  })

  it('reads the Primary battery only', () => {
    renderAt(KIOSK_WIDTH, {
      batteries: { a: BATTERY, b: faulty },
      primaryBatterySelection: 'a',
    })
    expect(screen.queryByRole('button', { name: /Battery protection/ })).not.toBeInTheDocument()
  })
})

describe('StartPage map card', () => {
  it('is right after the weather card, and not on the kiosk Dial', async () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    const pane = screen.getByTestId('pane-start')
    expect(pane.children[0]).toHaveTextContent('Weather')
    expect(
      await within(pane.children[1] as HTMLElement).findByTestId('map-card', {}, LAZY_MAP_WAIT),
    ).toBeVisible()
    expect(pane.children[2]).toHaveTextContent('Energy')

    cleanup()
    renderAt(KIOSK_WIDTH, {})
    expect(screen.queryByTestId('map-card')).not.toBeInTheDocument()
  })

  it('is edge to edge: no title row, and the map fills the card with no padding', async () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    const map = await screen.findByTestId('map-card', {}, LAZY_MAP_WAIT)
    const card = screen.getByTestId('pane-start').children[1] as HTMLElement
    expect(card).toContainElement(map)
    expect(card.className).toMatch(/\bp-0!/)
    // The card is rounded, the full-bleed page is not: the map takes the card's corners, so the
    // WebGL canvas is clipped by them.
    expect(map).toHaveClass('rounded-[inherit]')
    expect(card).not.toHaveTextContent('Map')
    expect(map.className).toMatch(/\bsize-full\b/)
    // The Battery card's dial is at most 300px wide and about square.
    expect(Number(/h-\[(\d+)px\]/.exec(card.className)?.[1])).toBeGreaterThanOrEqual(300)
  })

  it('centres on the van, with the van on it, when there is a fix', async () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {
      gps: { gps0: { fix_quality: 'gps', satellites_in_use: 9, latitude: 51.5, longitude: -0.12 } },
    })
    expect(await screen.findByTestId('map', {}, LAZY_MAP_WAIT)).toHaveAttribute(
      'data-center',
      '51.5,-0.12',
    )
    expect(screen.getByTestId('marker')).toBeInTheDocument()
    expect(screen.queryByTestId('gps-status')).not.toBeInTheDocument()
  })

  it('carries the Map page readout: fix quality, satellites and speed', async () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {
      gps: {
        gps0: {
          fix_quality: 'gps',
          satellites_in_use: 9,
          latitude: 51.5,
          longitude: -0.12,
          speed_kmh: 62.4,
        },
      },
    })
    const readout = await screen.findByTestId('map-readout', {}, LAZY_MAP_WAIT)
    expect(readout).toHaveTextContent('GPS')
    expect(readout).toHaveTextContent('9')
    expect(readout).toHaveTextContent('62 km/h')
  })

  it('still draws the map, with a notice and no readout, when there is no GPS', async () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    expect(await screen.findByTestId('map', {}, LAZY_MAP_WAIT)).toBeInTheDocument()
    expect(screen.getByTestId('gps-status')).toHaveTextContent('No GPS data yet')
    expect(screen.queryByTestId('map-readout')).not.toBeInTheDocument()
  })

  it('draws the dark or light map as the Map page setting says, not the app theme', async () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, { mapIsDark: true })
    expect(
      (await screen.findByTestId('map', {}, LAZY_MAP_WAIT)).getAttribute('data-sprite'),
    ).toMatch(/\/dark$/)
    cleanup()
    renderAt(JUST_BELOW_KIOSK_WIDTH, { mapIsDark: false })
    expect(
      (await screen.findByTestId('map', {}, LAZY_MAP_WAIT)).getAttribute('data-sprite'),
    ).toMatch(/\/light$/)
  })
})

describe('StartPage energy card', () => {
  // What the flow slide draws for each Settings choice. Tiles is a kiosk-width grid that clips in a
  // phone card, so its choice draws Van tiles: the same flow on a canvas that scales down.
  const DRAWN: Record<PowerLayout, string> = {
    tiles: 'power-van-tiles',
    orbs: 'power-orbs',
    'van-tiles': 'power-van-tiles',
    'van-orbs': 'power-van-orbs',
  }
  const ALL_IDS = ['power-tiles', 'power-orbs', 'power-van-tiles', 'power-van-orbs']
  const energyCard = () => screen.getByTestId('pane-start').children[2] as HTMLElement
  // The slides are found by their role description: the off-screen one is `aria-hidden`, which
  // role queries skip even with `hidden: true` once the name filter applies to it.
  const slidesOf = (card: HTMLElement) =>
    Array.from(card.querySelectorAll<HTMLElement>('[aria-roledescription="slide"]'))

  it.each(Object.keys(DRAWN) as PowerLayout[])(
    "draws the layout the Power page's %s setting calls for",
    (powerLayout) => {
      renderAt(JUST_BELOW_KIOSK_WIDTH, { batteries: { house: BATTERY }, powerLayout })

      expect(screen.getByTestId(DRAWN[powerLayout])).toBeInTheDocument()
      for (const other of ALL_IDS.filter((id) => id !== DRAWN[powerLayout])) {
        expect(screen.queryByTestId(other)).not.toBeInTheDocument()
      }
    },
  )

  it('says Power: no data yet, and draws no layout, before the battery has published', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    const [flow] = slidesOf(energyCard())

    expect(within(flow).getByText('Power')).toBeInTheDocument()
    expect(within(flow).getByText('No data yet')).toBeInTheDocument()
    for (const id of ALL_IDS) {
      expect(screen.queryByTestId(id)).not.toBeInTheDocument()
    }
  })

  it('labels both empty slides the same way: the reading, then "No data yet"', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    const [flow, battery] = slidesOf(energyCard())

    for (const [slide, label] of [
      [flow, 'Power'],
      [battery, 'Battery'],
    ] as const) {
      const status = within(slide).getByRole('status', { hidden: true })
      expect(status).toHaveTextContent(`${label}No data yet`)
    }
  })

  it('is a carousel of two slides: the power flow, then the battery dial', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, { batteries: { house: BATTERY } })
    const slides = slidesOf(energyCard())

    expect(slides.map((slide) => slide.getAttribute('aria-label'))).toEqual([
      'Power flow, 1 of 2',
      'Battery, 2 of 2',
    ])
    expect(within(slides[0]).getByTestId(DRAWN.tiles)).toBeInTheDocument()
    // `hidden`: slide 2 is off screen, so it is `aria-hidden` and its dial is not yet accessible.
    expect(
      within(slides[1]).getByRole('img', { name: /^Battery \d+%$/, hidden: true }),
    ).toBeInTheDocument()
  })

  it('has one dot per slide, the first current, and no tablist to confuse the navigation tabs', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    const dots = within(energyCard()).getAllByRole('button', { name: /^(Power flow|Battery)$/ })

    expect(dots).toHaveLength(2)
    expect(dots[0]).toHaveAttribute('aria-current', 'true')
    expect(dots[1]).not.toHaveAttribute('aria-current')
    expect(within(energyCard()).queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('scrolls to a slide when its dot is pressed, and the dot follows the scroll', async () => {
    const user = userEvent.setup()
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    const track = within(energyCard()).getByTestId('carousel-track')
    // jsdom has no layout: give the track a width and record where it is asked to scroll.
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 300 })
    const scrollTo = vi.fn((options: ScrollToOptions) => {
      track.scrollLeft = options.left ?? 0
      track.dispatchEvent(new Event('scroll'))
    })
    track.scrollTo = scrollTo as unknown as typeof track.scrollTo

    await user.click(within(energyCard()).getByRole('button', { name: 'Battery' }))
    expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' })
    await waitFor(() =>
      expect(within(energyCard()).getByRole('button', { name: 'Battery' })).toHaveAttribute(
        'aria-current',
        'true',
      ),
    )

    await user.click(within(energyCard()).getByRole('button', { name: 'Power flow' }))
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' })
  })

  it('hides the slide that is off screen from assistive technology', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    const [flow, battery] = slidesOf(energyCard())

    expect(flow).not.toHaveAttribute('aria-hidden')
    expect(battery).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('StartPage solar card', () => {
  const controller = (overrides: Partial<Solar> = {}): Solar => ({
    power_w: 412,
    battery_voltage_v: 13.4,
    yield_today_wh: 2140,
    ...overrides,
  })

  it('sits right under the energy card, with the live watts and the harvest today', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {
      batteries: { house: BATTERY },
      solar: { 291: controller() },
    })
    const pane = screen.getByTestId('pane-start')
    const titles = [...pane.children].map((card) => card.querySelector('[class*="card__header"]'))
    const energy = titles.findIndex((h) => h?.textContent === 'Energy')

    expect(titles[energy + 1]).toHaveTextContent('Solar production')
    expect(screen.getByTestId('solar-watts')).toHaveTextContent('412')
    expect(screen.getByTestId('solar-yield')).toHaveTextContent('2.1')
  })

  it('charts the controller’s harvest history, and leaves the chart out without one', () => {
    const withHistory = renderAt(JUST_BELOW_KIOSK_WIDTH, {
      solar: { 291: controller({ yield_history_wh: [2140, 1800, 0, null, 900] }) },
    })
    expect(screen.getAllByTestId('solar-history-day')).toHaveLength(5)
    withHistory.unmount()

    renderAt(JUST_BELOW_KIOSK_WIDTH, { solar: { 291: controller() } })
    expect(screen.getByTestId('solar-card')).toBeInTheDocument()
    expect(screen.queryByTestId('solar-history-day')).not.toBeInTheDocument()
  })

  it('charts two weeks of a long log, not the whole month', () => {
    const month = Array.from({ length: 31 }, (_, i) => 100 + i * 10)
    renderAt(JUST_BELOW_KIOSK_WIDTH, { solar: { 291: controller({ yield_history_wh: month }) } })

    expect(screen.getAllByTestId('solar-history-day')).toHaveLength(14)
  })

  it('has no card for a van without a complete solar controller', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, { solar: { 291: { power_w: 412 } } })

    expect(screen.queryByTestId('solar-card')).not.toBeInTheDocument()
  })

  it('keeps the harvest history out of the energy card: it has its own card', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {
      batteries: { house: BATTERY },
      solar: { 291: controller({ yield_history_wh: [2140, 1800, 900] }) },
      powerLayout: 'van-tiles',
    })
    const powerCard = screen.getByTestId('power-van-tiles')

    expect(within(powerCard).queryByTestId('solar-history-day')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('solar-history-day')).toHaveLength(3)
  })
})

describe('StartPage kiosk dial', () => {
  const OK_TILT = { tilt: { roll_deg: -2.2, pitch_deg: 4, status: 'ok' as const } }
  const GREY = tank({ fluid_type: 'grey_water', capacity_l: 80, level_pct: 41 })

  /** The rings' aria labels, outermost first. */
  function rings() {
    return within(screen.getByRole('group', { name: 'Levels' }))
      .getAllByRole('img')
      .map((el) => el.getAttribute('aria-label'))
  }

  it('draws the battery, fresh and grey water as rings, outermost first', () => {
    renderAt(KIOSK_WIDTH, {
      tanks: { fresh: tank(), grey: GREY },
      batteries: { house: BATTERY },
    })

    expect(rings()).toEqual(['Battery 78%', 'Fresh water 46%', 'Grey water 41%'])
  })

  it('reads the ring and the Battery power from the Primary battery, not the first to arrive', () => {
    const batteries = { b: { ...BATTERY, soc_pct: 40, power_w: -90 }, a: BATTERY }
    const auto = renderAt(KIOSK_WIDTH, { tanks: { fresh: tank(), grey: GREY }, batteries })
    expect(rings()[0]).toBe('Battery 78%')
    expect(
      within(screen.getByTestId('start-dial')).getByText('Load').parentElement,
    ).toHaveTextContent('35W')
    auto.unmount()

    renderAt(KIOSK_WIDTH, {
      tanks: { fresh: tank(), grey: GREY },
      batteries,
      primaryBatterySelection: 'b',
    })
    expect(rings()[0]).toBe('Battery 40%')
    expect(
      within(screen.getByTestId('start-dial')).getByText('Load').parentElement,
    ).toHaveTextContent('90W')
  })

  it('draws the rings the user configured, in that order', () => {
    renderAt(KIOSK_WIDTH, {
      tanks: { fresh: tank(), fuel: tank({ fluid_type: 'fuel', level_pct: 30 }) },
      batteries: { house: BATTERY },
      powerSources: { ...DEFAULT_START_POWER_SOURCES, rings: ['fuel', 'battery', 'fresh_water'] },
    })

    expect(rings()).toEqual(['Fuel 30%', 'Battery 78%', 'Fresh water 46%'])
  })

  it('reads every tank ring in litres when asked, and the battery stays in %', () => {
    renderAt(KIOSK_WIDTH, {
      tanks: { fresh: tank(), grey: GREY },
      batteries: { house: BATTERY },
      powerSources: { ...DEFAULT_START_POWER_SOURCES, ringUnit: 'litres' },
    })

    // 46% of 100 l, 41% of 80 l.
    expect(rings()).toEqual(['Battery 78%', 'Fresh water 46\u2113', 'Grey water 33\u2113'])
  })

  it('reads a faulted tank as 0 litres like its empty arc, never a stale count, with the other tanks still in litres', () => {
    renderAt(KIOSK_WIDTH, {
      tanks: { fresh: tank(), grey: { ...GREY, status: 'short_circuit', level_pct: 62 } },
      powerSources: { ...DEFAULT_START_POWER_SOURCES, ringUnit: 'litres' },
    })

    expect(rings()).toEqual(['Battery', 'Fresh water 46\u2113', 'Grey water 0\u2113'])
  })

  it('labels a ring whose data has not arrived without a number', () => {
    renderAt(KIOSK_WIDTH, { tanks: { fresh: tank() } })

    expect(rings()).toEqual(['Battery', 'Fresh water 46%', 'Grey water'])
  })

  it('shows the battery in the middle, and not again in the legend, without a usable tilt', () => {
    renderAt(KIOSK_WIDTH, {
      tanks: { fresh: tank(), grey: GREY },
      batteries: { house: BATTERY },
    })

    const centre = screen.getByTestId('rings-centre')
    expect(within(centre).getByText('78')).toBeInTheDocument()
    expect(subline('13.20V / 35W')).toBeInTheDocument()
    // The kiosk has no widget row, so without a usable tilt the tilt shows nowhere.
    expect(screen.queryByTestId('tilt-card')).not.toBeInTheDocument()
    expect(screen.getByText('Fresh water', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryAllByText('Battery', { selector: 'span' })).toHaveLength(0)
  })

  it('moves the tilt into the middle once it has a reading, and lists the battery in the legend', () => {
    renderAt(KIOSK_WIDTH, {
      tanks: { fresh: tank(), grey: GREY },
      batteries: { house: BATTERY },
      tilt: OK_TILT,
    })

    const centre = screen.getByTestId('rings-centre')
    expect(within(centre).getByTestId('tilt-pitch')).toHaveTextContent('+4.0°')
    expect(screen.getAllByTestId('tilt-card')).toHaveLength(1)
    expect(screen.getByText('Battery', { selector: 'span' })).toBeInTheDocument()
  })

  it('goes back to the battery when the tilt sensor errors, not to dashes', () => {
    renderAt(KIOSK_WIDTH, {
      batteries: { house: BATTERY },
      tilt: { tilt: { roll_deg: 4, pitch_deg: 3, status: 'sensor_error' } },
    })

    expect(within(screen.getByTestId('rings-centre')).getByText('78')).toBeInTheDocument()
  })

  it('says there is no data, not a number, in the middle before the battery arrives', () => {
    renderAt(KIOSK_WIDTH, {})

    expect(within(screen.getByTestId('rings-centre')).getByText('No data yet')).toBeInTheDocument()
  })

  it('reads solar and load from the configured sources, the load as the Power page shows it', () => {
    renderAt(KIOSK_WIDTH, {
      solar: { 291: { power_w: 247, battery_voltage_v: 13.4 } },
      batteries: { house: { ...BATTERY, power_w: -112 } },
    })

    const dial = screen.getByTestId('start-dial')
    expect(within(dial).getByText('Solar').parentElement).toHaveTextContent('247W')
    // The sun's 247 W plus the 112 W the battery gives up: everything the van draws, not just the
    // part the battery covers.
    expect(within(dial).getByText('Load').parentElement).toHaveTextContent('359W')
  })

  it('shows the load the sun is covering while the battery is still charging', () => {
    renderAt(KIOSK_WIDTH, {
      solar: { 291: { power_w: 15, battery_voltage_v: 13.4 } },
      batteries: { house: { ...BATTERY, power_w: 9 } },
    })

    const dial = screen.getByTestId('start-dial')
    expect(within(dial).getByText('Load').parentElement).toHaveTextContent('6W')
  })

  describe('charging reading', () => {
    it('is not shown while neither an alternator nor a shore charger is on the bus', () => {
      renderAt(KIOSK_WIDTH, { batteries: { house: { ...BATTERY, power_w: 300 } } })

      const dial = screen.getByTestId('start-dial')
      expect(within(dial).queryByText('Alternator')).not.toBeInTheDocument()
      expect(within(dial).queryByText('Shore power')).not.toBeInTheDocument()
      expect(within(dial).queryByText('Charging')).not.toBeInTheDocument()
    })

    it('shows the alternator from its published power', () => {
      renderAt(KIOSK_WIDTH, {
        chargers: { 1: { voltage_v: 13.4, power_w: 243, source: 'alternator' } },
      })

      const dial = screen.getByTestId('start-dial')
      expect(within(dial).getByText('Alternator').parentElement).toHaveTextContent('243W')
    })

    it('shows the shore charger, with watts derived from voltage and current', () => {
      renderAt(KIOSK_WIDTH, {
        chargers: { 2: { voltage_v: 14.4, current_a: 10, source: 'ac' } },
      })

      const dial = screen.getByTestId('start-dial')
      expect(within(dial).getByText('Shore power').parentElement).toHaveTextContent('144W')
    })

    it('sums the alternator and the shore charger as Chargers once both are charging', () => {
      renderAt(KIOSK_WIDTH, {
        chargers: {
          1: { voltage_v: 14.4, current_a: 10, source: 'ac' },
          2: { voltage_v: 13.4, power_w: 243, source: 'alternator' },
        },
      })

      const dial = screen.getByTestId('start-dial')
      expect(within(dial).getByText('Chargers').parentElement).toHaveTextContent('387W')
      expect(within(dial).queryByText('Alternator')).not.toBeInTheDocument()
      expect(within(dial).queryByText('Shore power')).not.toBeInTheDocument()
    })

    it('shows the shore charger while the alternator is on the bus but idle', () => {
      renderAt(KIOSK_WIDTH, {
        chargers: {
          1: { voltage_v: 13.1, current_a: 0, source: 'alternator' },
          2: { voltage_v: 13.28, current_a: 30, source: 'ac' },
        },
      })

      const dial = screen.getByTestId('start-dial')
      expect(within(dial).getByText('Shore power').parentElement).toHaveTextContent('398W')
      expect(within(dial).queryByText('Alternator')).not.toBeInTheDocument()
    })

    it('waits for the charger to say what it is, rather than guessing a source', () => {
      renderAt(KIOSK_WIDTH, { chargers: { 1: { voltage_v: 13.4, current_a: 5 } } })

      const dial = screen.getByTestId('start-dial')
      expect(within(dial).queryByText('Alternator')).not.toBeInTheDocument()
      expect(within(dial).queryByText('Shore power')).not.toBeInTheDocument()
    })
  })

  it('shows a dash, never a made-up 0 W, for a reading whose source has not published', () => {
    renderAt(KIOSK_WIDTH, {})

    const dial = screen.getByTestId('start-dial')
    expect(within(dial).getByText('Solar').parentElement).toHaveTextContent('\u2014')
    expect(within(dial).getByText('Solar').parentElement).not.toHaveTextContent('0W')
  })

  describe('temperatures above the half-moons', () => {
    const probe = (over: Partial<TemperatureSensor> = {}): Partial<TemperatureSensor> => ({
      temperature_c: 7.2,
      status: 'ok',
      unit: 'C',
      ...over,
    })

    it('shows the outdoor probe over the left half-moon and the indoor probe over the right', () => {
      renderAt(KIOSK_WIDTH, {
        temperatures: {
          outdoor: probe({ temperature_c: 7.2 }),
          indoor: probe({ temperature_c: 21.6 }),
        },
      })

      expect(screen.getByTestId('temp-outdoor')).toHaveTextContent('7°C')
      expect(screen.getByTestId('temp-indoor')).toHaveTextContent('22°C')
      expect(screen.getByTestId('temp-outdoor').parentElement).toContainElement(
        screen.getByText('Solar'),
      )
      expect(screen.getByTestId('temp-indoor').parentElement).toContainElement(
        screen.getByText('Load'),
      )
    })

    it('labels a probe with its configured name, else Outside / Inside', () => {
      renderAt(KIOSK_WIDTH, {
        temperatures: { outdoor: probe({ name: 'Awning' }), indoor: probe() },
      })

      expect(screen.getByTestId('temp-outdoor')).toHaveTextContent('Awning')
      expect(screen.getByTestId('temp-indoor')).toHaveTextContent('Inside')
    })

    it("shows the sensor's own unit, converted from the wire's Celsius", () => {
      renderAt(KIOSK_WIDTH, {
        temperatures: { indoor: probe({ temperature_c: 21.6, unit: 'F' }) },
      })

      expect(screen.getByTestId('temp-indoor')).toHaveTextContent('71°F')
    })

    it('never shows the retained value of a probe that is not ok', () => {
      renderAt(KIOSK_WIDTH, {
        temperatures: { outdoor: probe({ temperature_c: 99, status: 'disconnected' }) },
      })

      expect(screen.getByTestId('temp-outdoor')).toHaveTextContent('--°C')
      expect(screen.getByTestId('temp-outdoor')).not.toHaveTextContent('99')
    })

    it('draws the icon picked for the probe, else one by what the probe is', () => {
      renderAt(KIOSK_WIDTH, {
        temperatures: { outdoor: probe(), indoor: probe() },
        entityIcons: { 'temperature/outdoor': 'Refrigerator' },
      })

      expect(screen.getByTestId('temp-outdoor').querySelector('.lucide-refrigerator')).toBeTruthy()
      expect(screen.getByTestId('temp-outdoor').querySelector('.lucide-park')).toBeNull()
      expect(screen.getByTestId('temp-indoor').querySelector('.lucide-armchair')).toBeTruthy()
    })

    it('draws a CPU icon for the Pi probe and ignores an icon name it does not know', () => {
      renderAt(KIOSK_WIDTH, {
        powerSources: {
          ...DEFAULT_START_POWER_SOURCES,
          temperatures: { left: 'outdoor', right: 'raspicpu' },
        },
        temperatures: {
          outdoor: probe(),
          raspicpu: probe({ source: 'cpu' }),
        },
        entityIcons: { 'temperature/outdoor': 'NotAnIcon' },
      })

      expect(screen.getByTestId('temp-other').querySelector('.lucide-cpu')).toBeTruthy()
      expect(screen.getByTestId('temp-outdoor').querySelector('.lucide-park')).toBeTruthy()
    })

    it('shows dashes, not a number, before either probe has published', () => {
      renderAt(KIOSK_WIDTH, {})

      expect(screen.getByTestId('temp-outdoor')).toHaveTextContent('--°C')
      expect(screen.getByTestId('temp-indoor')).toHaveTextContent('--°C')
    })
  })
})

describe('StartPage weather widget', () => {
  const probe = (temperature_c: number, status: TemperatureSensor['status'] = 'ok') =>
    ({ temperature_c, status, unit: 'C' }) as Partial<TemperatureSensor>

  it.each([['phone', JUST_BELOW_KIOSK_WIDTH]])(
    'looks the forecast up at the van GPS position (%s)',
    async (_name, width) => {
      renderAt(width, {
        gps: {
          gps0: { fix_quality: 'gps', satellites_in_use: 7, latitude: 41.39, longitude: 2.17 },
        },
      })
      await screen.findByTestId('weather-outside')

      const url = String(fetchMock.mock.calls[0][0])
      expect(url).toContain('latitude=41.39')
      expect(url).toContain('longitude=2.17')
    },
  )

  it('shows the outlook under the current conditions: today first, then each day high over low', async () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    await screen.findByTestId('weather-outside')

    expect(screen.getByText('Today')).toBeInTheDocument()
    // The stubbed forecast has three days: today and two named ones, each with a rounded high and low.
    expect(screen.getByText('18°')).toBeInTheDocument()
    expect(screen.getByText('16°')).toBeInTheDocument()
    expect(screen.getByText('13°')).toBeInTheDocument()
    expect(screen.getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/)).toHaveLength(2)
  })

  it('asks for a week of forecast', async () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    await screen.findByTestId('weather-outside')

    expect(String(fetchMock.mock.calls[0][0])).toContain('forecast_days=7')
  })

  it('shows the outdoor probe as Outside and the indoor probe as Inside', async () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, { temperatures: { outdoor: probe(7.2), indoor: probe(21.6) } })

    expect(await screen.findByTestId('weather-outside')).toHaveTextContent('7°')
    expect(screen.getByTestId('weather-outside')).not.toHaveTextContent('forecast')
    expect(screen.getByTestId('weather-inside')).toHaveTextContent('22°')
  })

  it('falls back to the forecast air temperature, labelled, when the outdoor probe has no reading', async () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {
      temperatures: { outdoor: probe(99, 'disconnected'), indoor: probe(21) },
    })

    const outside = await screen.findByTestId('weather-outside')
    expect(outside).toHaveTextContent('14°')
    expect(outside).toHaveTextContent('(forecast)')
  })

  it('says the forecast is unavailable when the request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 })
    renderAt(JUST_BELOW_KIOSK_WIDTH, {})
    expect(await screen.findByText('Weather unavailable (HTTP 503)')).toBeInTheDocument()
  })
})

describe.each([['phone', JUST_BELOW_KIOSK_WIDTH]])('StartPage tilt widget (%s)', (_name, width) => {
  it('shows the van tilt from the device, tinted by the level tolerance', () => {
    renderAt(width, { tilt: { tilt: { roll_deg: 0.7, pitch_deg: -2.3, status: 'ok' } } })

    expect(screen.getByTestId('tilt-pitch')).toHaveTextContent('-2.3°')
    expect(screen.getByTestId('tilt-pitch')).toHaveClass('text-amber-500')
    expect(screen.getByTestId('tilt-roll')).toHaveTextContent('+0.7°')
    expect(screen.getByTestId('tilt-roll')).toHaveClass('text-emerald-400')
  })

  it('does not show stale tilt angles while the sensor is in error', () => {
    renderAt(width, { tilt: { tilt: { roll_deg: 4, pitch_deg: 3, status: 'sensor_error' } } })

    expect(screen.getByTestId('tilt-pitch')).toHaveTextContent('—')
    expect(screen.getByTestId('tilt-roll')).toHaveTextContent('—')
  })

  it('shows no angle before the device has published anything', () => {
    renderAt(width, {})

    expect(screen.getByTestId('tilt-pitch')).toHaveTextContent('—')
    expect(screen.getByTestId('tilt-roll')).toHaveTextContent('—')
  })
})
