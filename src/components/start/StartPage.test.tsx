import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import type { Battery, Charger, Gps, Solar, Tank, TemperatureSensor, Tilt } from '@/types'
import { DEFAULT_START_POWER_SOURCES, type StartPowerSources } from '@/hooks/useStartPowerSources'
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
    chargers?: Record<string, Partial<Charger>>
    temperatures?: Record<string, Partial<TemperatureSensor>>
    gps?: Record<string, Partial<Gps>>
    tilt?: Record<string, Partial<Tilt>>
    powerSources?: StartPowerSources
  },
) {
  viewport = stubMatchMedia(width)
  return render(
    <StartPage
      tanks={props.tanks ?? {}}
      batteries={props.batteries ?? {}}
      solar={props.solar ?? {}}
      chargers={props.chargers ?? {}}
      temperatures={props.temperatures ?? {}}
      gps={props.gps ?? {}}
      tilt={props.tilt ?? {}}
      powerSources={props.powerSources ?? DEFAULT_START_POWER_SOURCES}
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

describe.each([['phone', JUST_BELOW_KIOSK_WIDTH]])('StartPage (%s)', (_name, width) => {
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
      expect(within(dial).queryByText('Shore')).not.toBeInTheDocument()
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
      expect(within(dial).getByText('Shore').parentElement).toHaveTextContent('144W')
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
      expect(within(dial).queryByText('Shore')).not.toBeInTheDocument()
    })

    it('shows the shore charger while the alternator is on the bus but idle', () => {
      renderAt(KIOSK_WIDTH, {
        chargers: {
          1: { voltage_v: 13.1, current_a: 0, source: 'alternator' },
          2: { voltage_v: 13.28, current_a: 30, source: 'ac' },
        },
      })

      const dial = screen.getByTestId('start-dial')
      expect(within(dial).getByText('Shore').parentElement).toHaveTextContent('398W')
      expect(within(dial).queryByText('Alternator')).not.toBeInTheDocument()
    })

    it('waits for the charger to say what it is, rather than guessing a source', () => {
      renderAt(KIOSK_WIDTH, { chargers: { 1: { voltage_v: 13.4, current_a: 5 } } })

      const dial = screen.getByTestId('start-dial')
      expect(within(dial).queryByText('Alternator')).not.toBeInTheDocument()
      expect(within(dial).queryByText('Shore')).not.toBeInTheDocument()
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

describe.each([['phone', JUST_BELOW_KIOSK_WIDTH]])(
  'StartPage solar widget (%s)',
  (_name, width) => {
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
  },
)

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
