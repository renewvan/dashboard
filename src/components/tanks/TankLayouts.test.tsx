import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vite-plus/test'
import type { Tank } from '@/types'
import { TankCard } from './TankCard'
import { TankRow } from './TankRow'
import { FLUID_ICONS } from './fluidIcon'
import { FLUID_LABELS } from '@/lib/tank-labels'

const NOW = new Date('2026-07-14T12:00:00Z')
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()

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

const LOW_ALARM = {
  alarm_direction: 'low' as const,
  alarm_threshold_pct: 27,
  alarm_restore_pct: 48,
}

const layouts = [
  ['card (kiosk)', TankCard],
  ['row (phone)', TankRow],
] as const

describe.each(layouts)('%s', (_name, Layout) => {
  const show = (t: Tank, onConfigure = vi.fn()) =>
    render(<Layout id="t" tank={t} now={NOW} onConfigure={onConfigure} />)

  it('shows the fluid label, a Normal badge, the percentage and the litres', () => {
    show(tank({ capacity_l: 100, level_pct: 62 }))
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getAllByText('62%').length).toBeGreaterThan(0)
    expect(screen.getByText(/62\s*\/\s*100/)).toBeInTheDocument()
  })

  it('puts a decorative icon beside the fluid label, hidden from assistive tech', () => {
    const { container } = show(tank())
    const header = screen.getByText('Fresh water').parentElement as HTMLElement
    const icon = header.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    // The label stays the accessible name: the icon adds nothing a screen reader would read twice.
    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(0)
  })

  it('gives each fluid its own icon, so a fresh and a grey card are told apart at a glance', () => {
    const iconOf = (fluid_type: Tank['fluid_type'], label: string) => {
      const { unmount } = show(tank({ fluid_type }))
      const svg = (screen.getByText(label).parentElement as HTMLElement).querySelector('svg')
      const markup = svg?.innerHTML
      unmount()
      return markup
    }
    const fresh = iconOf('fresh_water', 'Fresh water')
    const grey = iconOf('grey_water', 'Grey water')
    expect(fresh).toBeTruthy()
    expect(grey).toBeTruthy()
    expect(fresh).not.toBe(grey)
  })

  it('shows a Fault badge and the fault reason, not a level', () => {
    show(tank({ fluid_type: 'grey_water', status: 'open_circuit', level_pct: 95 }))
    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByText('Open circuit')).toBeInTheDocument()
    expect(screen.queryByText(/95/)).not.toBeInTheDocument()
  })

  it('does not read a faulted tank as an empty one: no percentage readout', () => {
    // A mid-level tank shows its own readout; the card's 0% scale tick is the only 0% allowed.
    const { unmount } = show(tank({ level_pct: 62 }))
    const ticks = screen.queryAllByText('0%').length
    unmount()
    show(tank({ status: 'open_circuit', level_pct: 95 }))
    expect(screen.queryAllByText('0%')).toHaveLength(ticks)
  })

  it('names a short circuit', () => {
    show(tank({ status: 'short_circuit' }))
    expect(screen.getByText('Short circuit')).toBeInTheDocument()
  })

  // In the card, 100% and 0% are also scale ticks, so the readout is the one extra match
  // an out-of-range level adds over a mid-level tank.
  it('clamps an over-range level to 100%', () => {
    const { unmount } = show(tank({ level_pct: 62 }))
    const ticks = screen.queryAllByText('100%').length
    unmount()
    show(tank({ level_pct: 140 }))
    expect(screen.getAllByText('100%')).toHaveLength(ticks + 1)
    expect(screen.queryByText('140%')).not.toBeInTheDocument()
  })

  it('clamps a negative level to 0%', () => {
    const { unmount } = show(tank({ level_pct: 62 }))
    const ticks = screen.queryAllByText('0%').length
    unmount()
    show(tank({ level_pct: -5 }))
    expect(screen.getAllByText('0%')).toHaveLength(ticks + 1)
    expect(screen.queryByText('-5%')).not.toBeInTheDocument()
  })

  it('shows Temperature, with a dash when the tank has no sensor', () => {
    // No latch either, so the rate is also a dash: sensor-less shows two, a reading one.
    const { unmount } = show(tank())
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getAllByText('--')).toHaveLength(2)
    unmount()
    show(tank({ temperature_c: 18.4 }))
    expect(screen.getByText('18°C')).toBeInTheDocument()
    expect(screen.getAllByText('--')).toHaveLength(1)
  })

  it('shows a Drain Rate in L/h since the last refill for fresh water', () => {
    show(tank({ volume_since_full_l: 20, last_full_at: hoursAgo(10) }))
    expect(screen.getByText('Drain Rate')).toBeInTheDocument()
    expect(screen.queryByText('Fill Rate')).not.toBeInTheDocument()
    expect(screen.getByText('2.0 L/h')).toBeInTheDocument()
  })

  it('shows a Fill Rate in L/h since the last empty-out for grey water', () => {
    show(tank({ fluid_type: 'grey_water', volume_since_empty_l: 15, last_empty_at: hoursAgo(5) }))
    expect(screen.getByText('Fill Rate')).toBeInTheDocument()
    expect(screen.queryByText('Drain Rate')).not.toBeInTheDocument()
    expect(screen.getByText('3.0 L/h')).toBeInTheDocument()
  })

  it('shows a Status row worded by alarm direction and zone', () => {
    show(tank({ ...LOW_ALARM, level_pct: 15 }))
    expect(screen.getByText('Status')).toBeInTheDocument()
    // Badge and Status row agree: the same word twice.
    expect(screen.getAllByText('Low')).toHaveLength(2)
  })

  it('hides the Status row when no alarm is configured', () => {
    show(tank())
    expect(screen.queryByText('Status')).not.toBeInTheDocument()
  })

  it('agrees the badge and the Status row at 100% on a low-direction tank', () => {
    show(tank({ ...LOW_ALARM, level_pct: 100 }))
    expect(screen.getAllByText('Full')).toHaveLength(2)
  })

  it("opens this tank's settings when the card is tapped", async () => {
    const onConfigure = vi.fn()
    show(tank(), onConfigure)

    await userEvent.click(screen.getByRole('button', { name: /settings$/ }))

    expect(onConfigure).toHaveBeenCalledExactlyOnceWith('t')
  })
})

describe('card (kiosk) scale', () => {
  it('draws the 100/75/50/25/0% scale', () => {
    // A level of 62% keeps the in-fill label off every mark.
    render(<TankCard id="t" onConfigure={vi.fn()} tank={tank({ level_pct: 62 })} now={NOW} />)
    const scale = screen.getByTestId('tank-scale')
    for (const mark of ['100%', '75%', '50%', '25%', '0%']) {
      expect(within(scale).getByText(mark)).toBeInTheDocument()
    }
  })
})

describe('row (phone) has no tick labels', () => {
  it('omits the scale', () => {
    render(<TankRow id="t" onConfigure={vi.fn()} tank={tank({ level_pct: 62 })} now={NOW} />)
    expect(screen.queryByTestId('tank-scale')).not.toBeInTheDocument()
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })
})

describe('FLUID_ICONS', () => {
  it('has an icon for every fluid type, all different, so no fluid falls back to another one', () => {
    const fluids = Object.keys(FLUID_LABELS) as Tank['fluid_type'][]
    const icons = fluids.map((fluid) => FLUID_ICONS[fluid])
    expect(icons.every(Boolean)).toBe(true)
    expect(new Set(icons).size).toBe(fluids.length)
  })
})
