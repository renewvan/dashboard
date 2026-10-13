import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import type { Tank } from '@/types'
import { TanksPage } from './TanksPage'

const KIOSK_WIDTH = 800
const JUST_BELOW_KIOSK_WIDTH = 799

function tank(overrides: Partial<Tank> = {}): Tank {
  return {
    fluid_type: 'fresh_water',
    capacity_l: 100,
    level_pct: 62,
    status: 'ok',
    volume_since_full_l: 0,
    volume_since_empty_l: 0,
    ...overrides,
  }
}

const FRESH = tank()
const GREY = tank({ fluid_type: 'grey_water', capacity_l: 80, level_pct: 41 })

let viewport: MatchMediaStub
const onConfigure = vi.fn()
function renderAt(width: number, tanks: Record<string, Partial<Tank>>) {
  viewport = stubMatchMedia(width)
  return render(<TanksPage tanks={tanks as Record<string, Tank>} onConfigure={onConfigure} />)
}

afterEach(() => {
  onConfigure.mockClear()
  cleanup()
  viewport.restore()
})

describe.each([
  ['kiosk', KIOSK_WIDTH],
  ['phone', JUST_BELOW_KIOSK_WIDTH],
])('TanksPage (%s)', (_name, width) => {
  it('renders a card per tank, fresh water before grey, whatever the input order', () => {
    renderAt(width, { grey: GREY, fresh: FRESH })
    const names = screen.getAllByText(/^(Fresh|Grey) water$/).map((el) => el.textContent)
    expect(names).toEqual(['Fresh water', 'Grey water'])
  })

  it('shows the Fault badge and the sensor-fault reason instead of litres', () => {
    renderAt(width, { fresh: tank({ status: 'short_circuit' }) })
    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByText('Short circuit')).toBeInTheDocument()
    expect(screen.queryByText(/\u2113/)).not.toBeInTheDocument()
  })

  it('opens the settings of the tank whose Configure button is tapped', async () => {
    renderAt(width, { grey: GREY, fresh: FRESH })

    const buttons = screen.getAllByRole('button', { name: 'Configure' })
    await userEvent.click(buttons[1])

    expect(onConfigure).toHaveBeenCalledExactlyOnceWith('grey')
  })

  it('shows the empty state when no tank has reported', () => {
    renderAt(width, {})
    expect(screen.getByText('No tank data yet.')).toBeInTheDocument()
    expect(screen.getByText('Waiting for readings from the renewvan hub.')).toBeInTheDocument()
  })

  it('skips a tank whose record is still arriving over MQTT', () => {
    renderAt(width, { fresh: FRESH, grey: { fluid_type: 'grey_water', capacity_l: 80 } })
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
    expect(screen.queryByText('Grey water')).not.toBeInTheDocument()
  })

  it('shows the empty state when every tank is still partial', () => {
    renderAt(width, { fresh: { fluid_type: 'fresh_water' } })
    expect(screen.getByText('No tank data yet.')).toBeInTheDocument()
  })

  it('renders one tank and three tanks (the layout is not hardcoded to two)', () => {
    const { unmount } = renderAt(width, { fresh: FRESH })
    expect(screen.getAllByText(/Last refilled|Last emptied/)).toHaveLength(1)
    unmount()
    viewport.restore()
    renderAt(width, {
      fresh: FRESH,
      grey: GREY,
      black: tank({ fluid_type: 'black_water' }),
    })
    expect(screen.getAllByText(/Last refilled|Last emptied/)).toHaveLength(3)
  })

  it('orders any other tank after fresh and grey, by id', () => {
    renderAt(width, {
      propane: tank({ fluid_type: 'lpg' }),
      black: tank({ fluid_type: 'black_water' }),
      grey: GREY,
      fresh: FRESH,
    })
    const names = screen
      .getAllByText(/^(Fresh water|Grey water|Black water|LPG)$/)
      .map((el) => el.textContent)
    expect(names).toEqual(['Fresh water', 'Grey water', 'Black water', 'LPG'])
  })
})

describe('TanksPage layout switch', () => {
  it('draws the scale (card layout) at 800px', () => {
    renderAt(KIOSK_WIDTH, { fresh: FRESH })
    expect(screen.getAllByTestId('tank-scale')).toHaveLength(1)
  })

  it('draws rows with no scale at 799px', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH, { fresh: FRESH })
    expect(screen.queryByTestId('tank-scale')).not.toBeInTheDocument()
  })
})
