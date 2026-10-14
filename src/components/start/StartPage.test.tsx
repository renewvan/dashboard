import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import type { Battery, Gps, Solar, Tank, TemperatureSensor, Tilt } from '@/types'
import { COMPACT_BAR_COLUMNS } from '@/components/widgets/solar/solarView'
import { StartPage } from './StartPage'

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
function renderAt(
  width: number,
  props: {
    tanks?: Record<string, Partial<Tank>>
    batteries?: Record<string, Partial<Battery>>
    solar?: Record<string, Partial<Solar>>
    temperatures?: Record<string, Partial<TemperatureSensor>>
    gps?: Record<string, Partial<Gps>>
    tilt?: Record<string, Partial<Tilt>>
  },
) {
  viewport = stubMatchMedia(width)
  return render(
    <StartPage
      tanks={props.tanks ?? {}}
      batteries={props.batteries ?? {}}
      solar={props.solar ?? {}}
      temperatures={props.temperatures ?? {}}
      gps={props.gps ?? {}}
      tilt={props.tilt ?? {}}
      isDark
    />,
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
  cleanup()
  vi.unstubAllGlobals()
  viewport.restore()
})

/** A dial subline whose unit letters sit in their own span, so match on the whole line's text. */
function subline(text: string) {
  return screen.getByText((_, el) => el?.tagName === 'DIV' && el.textContent === text)
}

describe.each([
  ['kiosk', KIOSK_WIDTH],
  ['phone', JUST_BELOW_KIOSK_WIDTH],
])('StartPage (%s)', (_name, width) => {
  it('shows each dial with its live reading', () => {
    renderAt(width, {
      tanks: {
        fresh: tank(),
        grey: tank({ fluid_type: 'grey_water', capacity_l: 80, level_pct: 41 }),
      },
      batteries: { house: BATTERY },
    })

    expect(screen.getByRole('img', { name: 'Battery 78%' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fresh water 46%' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Grey water 41%' })).toBeInTheDocument()
    expect(subline('13.20V / 35W')).toBeInTheDocument()
    // The runtime estimate is parked: the source publishes it, the dial does not show it.
    expect(screen.queryByText(/to go/)).not.toBeInTheDocument()
    expect(subline('46 / 100 \u2113')).toBeInTheDocument()
    expect(subline('33 / 80 \u2113')).toBeInTheDocument()
  })

  it('shows "No data yet" instead of a number for a dial whose data has not arrived', () => {
    renderAt(width, { tanks: { fresh: tank() } })

    expect(screen.getByRole('img', { name: 'Fresh water 46%' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /^Battery/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /^Grey water/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('No data yet')).toHaveLength(2)
  })

  it('does not draw a dial from a half-arrived record', () => {
    renderAt(width, {
      tanks: { grey: { fluid_type: 'grey_water', capacity_l: 80 } },
      batteries: { house: { soc_pct: 78 } },
    })

    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(screen.getAllByText('No data yet')).toHaveLength(3)
  })

  it('shows a faulted tank as a fault, with its reason, not as a level', () => {
    renderAt(width, { tanks: { fresh: tank({ status: 'short_circuit', level_pct: 62 }) } })

    expect(screen.getByRole('img', { name: 'Fresh water 0%' })).toBeInTheDocument()
    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByText('Short circuit')).toBeInTheDocument()
  })
})

describe('StartPage layout', () => {
  it('puts the battery first on a phone, where order is the reading priority', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {
      tanks: { fresh: tank(), grey: tank({ fluid_type: 'grey_water' }) },
      batteries: { house: BATTERY },
    })
    const pane = screen.getByTestId('pane-start')
    const titles = within(pane)
      .getAllByRole('img')
      .map((el) => el.getAttribute('aria-label')?.replace(/ \d+%$/, ''))
    expect(titles).toEqual(['Battery', 'Fresh water', 'Grey water'])
  })

  it('puts fresh water, battery, grey water left to right on the kiosk', () => {
    renderAt(KIOSK_WIDTH, {
      tanks: { fresh: tank(), grey: tank({ fluid_type: 'grey_water' }) },
      batteries: { house: BATTERY },
    })
    const titles = screen
      .getAllByRole('img')
      .map((el) => el.getAttribute('aria-label')?.replace(/ \d+%$/, ''))
    expect(titles).toEqual(['Fresh water', 'Battery', 'Grey water'])
  })
})

describe('StartPage solar placement (kiosk)', () => {
  const solar = { 291: { power_w: 412, battery_voltage_v: 13.4, yield_today_wh: 2140 } }

  it('shows solar inside the battery dial, in its open bottom gap, and nowhere else', () => {
    renderAt(KIOSK_WIDTH, { solar, batteries: { house: BATTERY } })

    expect(screen.getAllByTestId('solar-card')).toHaveLength(1)
    expect(within(screen.getByTestId('dial-bottom')).getByTestId('solar-card')).toBeInTheDocument()
  })

  it('draws fewer bars than the full widget, to fit the dial', () => {
    renderAt(KIOSK_WIDTH, { solar, batteries: { house: BATTERY } })

    const bars = within(screen.getByRole('meter', { name: 'Solar power' })).getAllByTestId(
      'solar-bar',
    )
    expect(bars).toHaveLength(COMPACT_BAR_COLUMNS)
  })

  it('has no solar readout without a battery dial to hold it', () => {
    renderAt(KIOSK_WIDTH, { solar })

    expect(screen.queryByTestId('solar-card')).not.toBeInTheDocument()
  })
})

describe('StartPage weather widget', () => {
  const probe = (temperature_c: number, status: TemperatureSensor['status'] = 'ok') =>
    ({ temperature_c, status, unit: 'C' }) as Partial<TemperatureSensor>

  it.each([
    ['kiosk', KIOSK_WIDTH],
    ['phone', JUST_BELOW_KIOSK_WIDTH],
  ])('looks the forecast up at the van GPS position (%s)', async (_name, width) => {
    renderAt(width, {
      gps: { gps0: { fix_quality: 'gps', satellites_in_use: 7, latitude: 41.39, longitude: 2.17 } },
    })
    await screen.findByTestId('weather-outside')

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('latitude=41.39')
    expect(url).toContain('longitude=2.17')
  })

  it('shows the outdoor probe as Outside and the indoor probe as Inside', async () => {
    renderAt(KIOSK_WIDTH, { temperatures: { outdoor: probe(7.2), indoor: probe(21.6) } })

    expect(await screen.findByTestId('weather-outside')).toHaveTextContent('7°')
    expect(screen.getByTestId('weather-outside')).not.toHaveTextContent('forecast')
    expect(screen.getByTestId('weather-inside')).toHaveTextContent('22°')
  })

  it('falls back to the forecast air temperature, labelled, when the outdoor probe has no reading', async () => {
    renderAt(KIOSK_WIDTH, {
      temperatures: { outdoor: probe(99, 'disconnected'), indoor: probe(21) },
    })

    const outside = await screen.findByTestId('weather-outside')
    expect(outside).toHaveTextContent('14°')
    expect(outside).toHaveTextContent('(forecast)')
  })

  it('says the forecast is unavailable when the request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 })
    renderAt(KIOSK_WIDTH, {})
    expect(await screen.findByText('Weather unavailable (HTTP 503)')).toBeInTheDocument()
  })
})

describe.each([
  ['kiosk', KIOSK_WIDTH],
  ['phone', JUST_BELOW_KIOSK_WIDTH],
])('StartPage tilt widget (%s)', (_name, width) => {
  it('shows the van tilt from the node, tinted by the level tolerance', () => {
    renderAt(width, { tilt: { tilt: { roll_deg: 0.7, pitch_deg: -2.3, status: 'ok' } } })

    expect(screen.getByTestId('tilt-pitch')).toHaveTextContent('-2.3°')
    expect(screen.getByTestId('tilt-pitch')).toHaveClass('text-amber-400')
    expect(screen.getByTestId('tilt-roll')).toHaveTextContent('+0.7°')
    expect(screen.getByTestId('tilt-roll')).toHaveClass('text-emerald-400')
  })

  it('does not show stale tilt angles while the sensor is in error', () => {
    renderAt(width, { tilt: { tilt: { roll_deg: 4, pitch_deg: 3, status: 'sensor_error' } } })

    expect(screen.getByTestId('tilt-pitch')).toHaveTextContent('—')
    expect(screen.getByTestId('tilt-roll')).toHaveTextContent('—')
  })

  it('shows no angle before the node has published anything', () => {
    renderAt(width, {})

    expect(screen.getByTestId('tilt-pitch')).toHaveTextContent('—')
    expect(screen.getByTestId('tilt-roll')).toHaveTextContent('—')
  })
})

describe.each([
  ['kiosk', KIOSK_WIDTH],
  ['phone', JUST_BELOW_KIOSK_WIDTH],
])('StartPage solar widget (%s)', (_name, width) => {
  const controller = (overrides: Partial<Solar> = {}): Solar => ({
    power_w: 412,
    battery_voltage_v: 13.4,
    yield_today_wh: 2140,
    charge_state: 'bulk',
    ...overrides,
  })

  it('shows the live watts from the controller', () => {
    renderAt(width, { solar: { 291: controller() }, batteries: { house: BATTERY } })

    expect(screen.getByTestId('solar-watts')).toHaveTextContent('412')
  })

  it('shows nothing before a controller has published its required fields', () => {
    renderAt(width, { solar: { 291: { power_w: 412 } }, batteries: { house: BATTERY } })

    expect(screen.queryByTestId('solar-card')).not.toBeInTheDocument()
  })

  it('shows a fault instead of the watts', () => {
    renderAt(width, {
      solar: { 291: controller({ charge_state: 'fault', power_w: 0 }) },
      batteries: { house: BATTERY },
    })

    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.queryByTestId('solar-watts')).not.toBeInTheDocument()
  })

  it('reports the reading to assistive tech as a meter, not as a dial', () => {
    renderAt(width, { solar: { 291: controller() }, batteries: { house: BATTERY } })

    const meter = screen.getByRole('meter', { name: 'Solar power' })
    expect(meter).toHaveAttribute('aria-valuenow', '412')
    expect(meter).toHaveAttribute('aria-valuetext', '412 W')
    expect(within(screen.getByTestId('solar-card')).queryAllByRole('img')).toHaveLength(0)
  })
})

describe('StartPage solar harvest today', () => {
  const controller = (overrides: Partial<Solar> = {}): Solar => ({
    power_w: 412,
    battery_voltage_v: 13.4,
    yield_today_wh: 2140,
    charge_state: 'bulk',
    ...overrides,
  })

  it('shows the harvest today on a phone, in the fresh water card', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {
      solar: { 291: controller() },
      batteries: { house: BATTERY },
    })

    expect(screen.getByTestId('solar-yield')).toHaveTextContent('2.1')
  })

  it('shows no harvest figure on a phone when the controller does not report one', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, {
      solar: { 291: controller({ yield_today_wh: undefined }) },
      batteries: { house: BATTERY },
    })

    expect(screen.getByTestId('solar-yield')).toHaveTextContent('—')
  })

  it('leaves the harvest out of the battery dial on the kiosk', () => {
    renderAt(KIOSK_WIDTH, { solar: { 291: controller() }, batteries: { house: BATTERY } })

    expect(screen.queryByTestId('solar-yield')).not.toBeInTheDocument()
  })
})
