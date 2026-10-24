import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import type { Battery, Charger, Solar } from '@/types'
import { PowerPage } from './PowerPage'

/** jsdom has no `ResizeObserver`, which the Tiles layout measures its links with. */
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const KIOSK_WIDTH = 800
const JUST_BELOW_KIOSK_WIDTH = 799

let viewport: MatchMediaStub

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver)
  viewport = stubMatchMedia(KIOSK_WIDTH)
})

afterEach(() => {
  vi.unstubAllGlobals()
  viewport.restore()
})

const battery: Battery = { soc_pct: 83, voltage_v: 13.6, current_a: 69.9, power_w: 950 }
const sun: Solar = { power_w: 1850, battery_voltage_v: 13.4 }
const none: Record<string, Partial<Charger>> = {}

describe('PowerPage', () => {
  it('draws the Tiles layout when asked for tiles', () => {
    render(
      <PowerPage
        batteries={{ house: battery }}
        solar={{ roof: sun }}
        chargers={none}
        layout="tiles"
      />,
    )

    expect(screen.getByTestId('power-tiles')).toBeInTheDocument()
    expect(screen.queryByTestId('power-orbs')).not.toBeInTheDocument()
  })

  it('draws the Orbs layout when asked for orbs', () => {
    render(
      <PowerPage
        batteries={{ house: battery }}
        solar={{ roof: sun }}
        chargers={none}
        layout="orbs"
      />,
    )

    expect(screen.getByTestId('power-orbs')).toBeInTheDocument()
    expect(screen.queryByTestId('power-tiles')).not.toBeInTheDocument()
  })

  it('shows the same numbers in both layouts', () => {
    const props = { batteries: { house: battery }, solar: { roof: sun }, chargers: none }

    const tiles = render(<PowerPage {...props} layout="tiles" />)
    expect(screen.getByText('83')).toBeInTheDocument()
    expect(screen.getByText('900')).toBeInTheDocument()
    tiles.unmount()

    render(<PowerPage {...props} layout="orbs" />)
    expect(screen.getByText('83')).toBeInTheDocument()
    expect(screen.getByText('900')).toBeInTheDocument()
  })

  it.each(['tiles', 'orbs'] as const)(
    'says "No data yet" in the %s layout until the battery has published, never a number',
    (layout) => {
      render(
        <PowerPage
          batteries={{ house: { soc_pct: 83 } }}
          solar={{ roof: sun }}
          chargers={none}
          layout={layout}
        />,
      )

      expect(screen.getByRole('status')).toHaveTextContent('No data yet')
      expect(screen.queryByTestId('power-tiles')).not.toBeInTheDocument()
      expect(screen.queryByTestId('power-orbs')).not.toBeInTheDocument()
    },
  )

  describe('with two batteries', () => {
    const bank = { driver: 'wattcycle', ...battery, soc_pct: 61 }
    const house = { driver: 'venus', name: 'House', ...battery, soc_pct: 83 }
    const drivers = [
      { key: 'venus', name: 'Venus' },
      { key: 'wattcycle', name: 'WattCycle' },
    ]
    const page = (
      batteries: Record<string, Partial<Battery>>,
      primaryBatterySelection?: string,
    ) => (
      <PowerPage
        batteries={batteries}
        primaryBatterySelection={primaryBatterySelection}
        drivers={drivers}
        solar={{}}
        chargers={none}
        layout="tiles"
      />
    )

    it('reads the same battery whichever one arrived first (Auto: first by id)', () => {
      const first = render(page({ '512': house, wattcycle: bank }, 'auto'))
      expect(screen.getByText('83')).toBeInTheDocument()
      first.unmount()

      render(page({ wattcycle: bank, '512': house }, 'auto'))
      expect(screen.getByText('83')).toBeInTheDocument()
    })

    it('follows the selected instance and names it under the layout', () => {
      render(page({ '512': house, wattcycle: bank }, 'wattcycle'))

      expect(screen.getByText('61')).toBeInTheDocument()
      expect(screen.queryByText('83')).not.toBeInTheDocument()
      expect(screen.getByTestId('power-battery-source')).toHaveTextContent(
        'Battery: WattCycle · wattcycle',
      )
    })

    it('falls back to Auto while the selected instance is not on the bus', () => {
      render(page({ '512': house, wattcycle: bank }, 'gone'))

      expect(screen.getByText('83')).toBeInTheDocument()
      expect(screen.getByTestId('power-battery-source')).toHaveTextContent('Battery: House')
    })

    it('names nothing with a single battery', () => {
      render(page({ '512': house }, 'auto'))

      expect(screen.queryByTestId('power-battery-source')).not.toBeInTheDocument()
    })
  })

  describe('the battery tile in the Tiles layout', () => {
    const tiles = (house: Battery) =>
      render(<PowerPage batteries={{ house }} solar={{}} chargers={none} layout="tiles" />)

    it('shows a discharging battery with its current and power signed, as Venus does', () => {
      tiles({ soc_pct: 98, voltage_v: 13.29, current_a: -0.8, power_w: -11 })

      expect(screen.getByText('Discharging')).toBeInTheDocument()
      expect(screen.getByText('13.29 V')).toBeInTheDocument()
      expect(screen.getByText('-0.8 A')).toBeInTheDocument()
      expect(screen.getByText('-11 W')).toBeInTheDocument()
    })

    it('shows a charging battery with positive readings', () => {
      tiles({ soc_pct: 83, voltage_v: 13.6, current_a: 69.9, power_w: 950 })

      expect(screen.getByText('Charging')).toBeInTheDocument()
      expect(screen.getByText('69.9 A')).toBeInTheDocument()
      expect(screen.getByText('950 W')).toBeInTheDocument()
    })

    it('says Idle for a battery that is neither charging nor discharging', () => {
      tiles({ soc_pct: 100, voltage_v: 13.5, current_a: 0, power_w: 0 })

      expect(screen.getByText('Idle')).toBeInTheDocument()
    })

    it("shows the time to go in the Start page's format, and only when the battery publishes it", () => {
      const first = tiles({
        soc_pct: 72,
        voltage_v: 12.6,
        current_a: -57,
        power_w: -720,
        time_to_go_s: 5 * 3_600 + 12 * 60 + 59,
      })
      // Two largest units, truncated: not "5 h 12 min", and not rounded up to 5h 13m.
      expect(screen.getByText('5h 12m')).toBeInTheDocument()
      first.unmount()

      tiles({ soc_pct: 72, voltage_v: 12.6, current_a: -57, power_w: -720 })
      expect(screen.queryByText(/\d+[dhm]\b/)).not.toBeInTheDocument()
    })
  })

  describe('the Solar tile in the Tiles layout', () => {
    const page = (solar: Record<string, Partial<Solar>>) => (
      <PowerPage batteries={{ house: battery }} solar={solar} chargers={none} layout="tiles" />
    )

    describe('the harvest history', () => {
      const roof = (history?: (number | null)[]): Record<string, Partial<Solar>> => ({
        roof: { power_w: 412, battery_voltage_v: 13.4, yield_history_wh: history },
      })

      it('charts the last ten days of the controller log inside the Solar tile', () => {
        render(page(roof([210, 180, 190, 140, 160, 130, 10, 0, 0, 0, 40, 300])))

        const chart = screen.getByRole('img', { name: 'Solar harvest, last 10 days' })
        expect(chart.closest('[data-testid="power-tiles"]')).not.toBeNull()
        expect(screen.getAllByTestId('solar-history-day')).toHaveLength(10)
      })

      it('reads back each day for assistive tech, newest first, in kWh', () => {
        render(page(roof([210, 1840, null])))

        expect(screen.getByRole('img', { name: 'Solar harvest, last 3 days' })).toHaveAttribute(
          'aria-description',
          'today: 0.2 kWh, yesterday: 1.8 kWh, 2 days ago: no data',
        )
      })

      it('marks a day the controller has no data for as a gap, not as a zero', () => {
        render(page(roof([210, null, 0])))

        const days = screen.getAllByTestId('solar-history-day')
        // Oldest first: [0 Wh two days ago, null yesterday, 210 Wh today].
        expect(days.map((d) => d.dataset.gap)).toEqual([undefined, 'true', undefined])
      })

      it('draws no chart while the controller has published no history', () => {
        render(page(roof(undefined)))

        expect(screen.queryByRole('img', { name: /Solar harvest/ })).not.toBeInTheDocument()
      })

      it('draws no chart until the controller has published its required fields', () => {
        render(page({ roof: { power_w: 412, yield_history_wh: [210, 180] } }))

        expect(screen.queryByRole('img', { name: /Solar harvest/ })).not.toBeInTheDocument()
      })

      it('draws no chart when there is no solar controller at all', () => {
        render(page({}))

        expect(screen.queryByRole('img', { name: /Solar harvest/ })).not.toBeInTheDocument()
      })
    })
  })
})

describe('PowerPage on a phone', () => {
  const history = [2140, 1800, 0, null, 900]
  const withHistory: Solar = { ...sun, yield_today_wh: 2140, yield_history_wh: history }
  const phone = (solar: Record<string, Partial<Solar>>, layout: 'tiles' | 'orbs' = 'tiles') => {
    viewport.setViewportWidth(JUST_BELOW_KIOSK_WIDTH)
    return render(
      <PowerPage batteries={{ house: battery }} solar={solar} chargers={none} layout={layout} />,
    )
  }

  it('is two cards: the flow, then the solar controller', () => {
    phone({ roof: withHistory })
    const page = screen.getByTestId('pane-power')

    const titles = [...page.children].map(
      (card) => card.querySelector('[class*="card__header"]')?.textContent,
    )
    expect(titles).toEqual(['Power', 'Solar'])
  })

  it('charts the harvest in the Solar card, not inside the flow card', () => {
    phone({ roof: withHistory }, 'tiles')
    const [flowCard, solarCard] = [...screen.getByTestId('pane-power').children] as HTMLElement[]

    expect(within(solarCard).getAllByTestId('solar-history-day')).toHaveLength(history.length)
    expect(within(flowCard).queryByTestId('solar-history-day')).not.toBeInTheDocument()
  })

  it('draws a card-sized flow in place of the kiosk Tiles grid, which clips at a phone width', () => {
    phone({ roof: withHistory }, 'tiles')

    expect(screen.getByTestId('power-van-tiles')).toBeInTheDocument()
    expect(screen.queryByTestId('power-tiles')).not.toBeInTheDocument()
  })

  it('has no Solar card for a van without a complete solar controller', () => {
    phone({})

    expect(screen.getByTestId('pane-power').children).toHaveLength(1)
    expect(screen.queryByTestId('solar-card')).not.toBeInTheDocument()
  })

  it('says no data yet in the flow card until the battery has published', () => {
    viewport.setViewportWidth(JUST_BELOW_KIOSK_WIDTH)
    render(
      <PowerPage
        batteries={{ house: { soc_pct: 83 } }}
        solar={{ roof: withHistory }}
        chargers={none}
        layout="orbs"
      />,
    )

    expect(screen.getByText('No data yet')).toBeInTheDocument()
    expect(screen.queryByTestId('power-orbs')).not.toBeInTheDocument()
  })
})
