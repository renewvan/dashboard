import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Battery, Charger, Solar } from '@/types'
import { PowerPage } from './PowerPage'

/** jsdom has no `ResizeObserver`, which the Tiles layout measures its links with. */
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
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
    expect(screen.queryByTestId('power-flow')).not.toBeInTheDocument()
  })

  it('draws the Flow layout when asked for flow', () => {
    render(
      <PowerPage
        batteries={{ house: battery }}
        solar={{ roof: sun }}
        chargers={none}
        layout="flow"
      />,
    )

    expect(screen.getByTestId('power-flow')).toBeInTheDocument()
    expect(screen.queryByTestId('power-tiles')).not.toBeInTheDocument()
  })

  it('shows the same numbers in both layouts', () => {
    const props = { batteries: { house: battery }, solar: { roof: sun }, chargers: none }

    const tiles = render(<PowerPage {...props} layout="tiles" />)
    expect(screen.getByText('83')).toBeInTheDocument()
    expect(screen.getByText('900')).toBeInTheDocument()
    tiles.unmount()

    render(<PowerPage {...props} layout="flow" />)
    expect(screen.getByText('83%')).toBeInTheDocument()
    expect(screen.getByText('900')).toBeInTheDocument()
  })

  it.each(['tiles', 'flow'] as const)(
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
      expect(screen.queryByTestId('power-flow')).not.toBeInTheDocument()
    },
  )

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

    it("draws the Start page's solar bars inside the Solar tile, reading the live power", () => {
      render(page({ roof: { power_w: 412, battery_voltage_v: 13.4 } }))

      const meter = screen.getByRole('meter', { name: 'Solar power' })
      expect(meter).toHaveAttribute('aria-valuetext', '412 W')
      expect(meter.closest('[data-testid="power-tiles"]')).not.toBeNull()
      expect(screen.getAllByTestId('solar-bar').length).toBeGreaterThan(0)
    })

    it('scales the bars against the highest reading seen, like the Start page, not against the current one', () => {
      const { rerender } = render(page({ roof: { power_w: 800, battery_voltage_v: 13.4 } }))
      rerender(page({ roof: { power_w: 200, battery_voltage_v: 13.4 } }))

      const meter = screen.getByRole('meter', { name: 'Solar power' })
      expect(meter).toHaveAttribute('aria-valuenow', '200')
      expect(meter).toHaveAttribute('aria-valuemax', '800')
    })

    it('draws no bars until a controller has published its required fields', () => {
      render(page({ roof: { power_w: 412 } }))

      expect(screen.queryByRole('meter', { name: 'Solar power' })).not.toBeInTheDocument()
    })

    it('draws no bars when there is no solar controller at all', () => {
      render(page({}))

      expect(screen.queryByRole('meter', { name: 'Solar power' })).not.toBeInTheDocument()
    })

    it('draws the bars in the Solar tile only, not in the battery or the loads', () => {
      render(page({ roof: { power_w: 412, battery_voltage_v: 13.4 } }))

      expect(screen.getAllByRole('meter')).toHaveLength(1)
    })

    it('lights nothing on a faulted controller', () => {
      render(page({ roof: { power_w: 412, battery_voltage_v: 13.4, charge_state: 'fault' } }))

      expect(screen.getByRole('meter', { name: 'Solar power' })).toHaveAttribute(
        'aria-valuetext',
        'Fault',
      )
    })
  })
})
