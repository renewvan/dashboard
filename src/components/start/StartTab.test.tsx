import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import type { Battery, Tank } from '@/types'
import { StartTab } from './StartTab'

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
  props: { tanks?: Record<string, Partial<Tank>>; batteries?: Record<string, Partial<Battery>> },
) {
  viewport = stubMatchMedia(width)
  return render(<StartTab tanks={props.tanks ?? {}} batteries={props.batteries ?? {}} isDark />)
}

afterEach(() => {
  cleanup()
  viewport.restore()
})

/** A dial subline whose unit letters sit in their own span, so match on the whole line's text. */
function subline(text: string) {
  return screen.getByText((_, el) => el?.tagName === 'DIV' && el.textContent === text)
}

describe.each([
  ['kiosk', KIOSK_WIDTH],
  ['phone', JUST_BELOW_KIOSK_WIDTH],
])('StartTab (%s)', (_name, width) => {
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
    expect(screen.getByText('9d 23h to go')).toBeInTheDocument()
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

  it('reads an unconnected weather widget as such, never as a reading', () => {
    renderAt(width, {})
    expect(screen.getByText('Weather')).toBeInTheDocument()
    expect(screen.getByText('Not connected')).toBeInTheDocument()
  })

  it('shows a faulted tank as a fault, with its reason, not as a level', () => {
    renderAt(width, { tanks: { fresh: tank({ status: 'short_circuit', level_pct: 62 }) } })

    expect(screen.getByRole('img', { name: 'Fresh water 0%' })).toBeInTheDocument()
    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByText('Short circuit')).toBeInTheDocument()
  })
})

describe('StartTab layout', () => {
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
