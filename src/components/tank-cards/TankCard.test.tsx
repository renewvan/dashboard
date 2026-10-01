import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TankCard } from './TankCard'

// Mirrors TankCard's own MONTHS/HH:MM shape, computed from the same Date
// the component renders from — so the assertion holds regardless of the
// CI runner's local timezone (only the component's chosen shape is under
// test, not a specific UTC-offset-dependent clock reading).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function expectedLatchDate(iso: string): RegExp {
  const date = new Date(iso)
  return new RegExp(`^${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} \\d{2}:\\d{2}$`)
}

describe('TankCard', () => {
  it('renders fluid label, badge, percentage, and liters for an ok tank', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 62,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          last_full_at: '2026-07-14T12:00:00+00:00',
        }}
      />,
    )
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('62%')).toBeInTheDocument()
    expect(screen.getByText(/62\/100/)).toBeInTheDocument()
    expect(screen.getByText('Last refilled:')).toBeInTheDocument()
    expect(screen.getByText(expectedLatchDate('2026-07-14T12:00:00+00:00'))).toBeInTheDocument()
  })

  it('shows "Last emptied" from last_empty_at for a non-fresh-water tank', () => {
    render(
      <TankCard
        id="grey"
        tank={{
          fluid_type: 'grey_water',
          capacity_l: 80,
          level_pct: 41,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          last_empty_at: '2026-08-03T12:00:00+00:00',
        }}
      />,
    )
    expect(screen.getByText('Last emptied:')).toBeInTheDocument()
    expect(screen.getByText(expectedLatchDate('2026-08-03T12:00:00+00:00'))).toBeInTheDocument()
  })

  it('shows a placeholder dash when the tank has never latched full/empty', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 62,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getByText('Last refilled:')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows a Fault badge and the fault reason for a faulted tank', () => {
    render(
      <TankCard
        id="grey"
        tank={{
          fluid_type: 'grey_water',
          capacity_l: 80,
          level_pct: 0,
          status: 'open_circuit',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByText('Open circuit')).toBeInTheDocument()
  })

  it('clamps an out-of-range level_pct into the displayed value', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 140,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0)
  })

  it('clamps a negative level_pct to zero', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: -5,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
  })

  it('renders the full 100/75/50/25/0% tick-marked scale', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 50,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    for (const mark of ['100%', '75%', '25%', '0%']) {
      expect(screen.getByText(mark)).toBeInTheDocument()
    }
  })

  it('shows Temperature and Drain Rate with a placeholder dash when unconfigured/never latched, but hides Status', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 62,
          status: 'ok',
          volume_since_full_l: 45.6,
          volume_since_empty_l: 12.3,
        }}
      />,
    )
    const column = screen.getByTestId('tank-info-column')
    expect(column).not.toHaveTextContent('Status')
    expect(column).toHaveTextContent('Temperature')
    expect(column).toHaveTextContent('Drain Rate')
    expect(column).not.toHaveTextContent('Fill Rate')
  })

  it('shows Temperature when temperature_c is present', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 62,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          temperature_c: 18.4,
        }}
      />,
    )
    const column = screen.getByTestId('tank-info-column')
    expect(column).toHaveTextContent('Temperature')
    expect(column).toHaveTextContent('18°C')
  })

  it('shows a pace-based Drain Rate in L/h since last refill for fresh water', () => {
    const hoursAgo = 10
    const latch = new Date(Date.now() - hoursAgo * 3_600_000).toISOString()
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 62,
          status: 'ok',
          volume_since_full_l: 20,
          volume_since_empty_l: 0,
          last_full_at: latch,
        }}
      />,
    )
    const column = screen.getByTestId('tank-info-column')
    expect(column).toHaveTextContent('Drain Rate')
    expect(column).not.toHaveTextContent('Fill Rate')
    expect(column).toHaveTextContent('2.0 L/h')
  })

  it('shows a pace-based Fill Rate in L/h since last empty-out for grey water', () => {
    const hoursAgo = 5
    const latch = new Date(Date.now() - hoursAgo * 3_600_000).toISOString()
    render(
      <TankCard
        id="grey"
        tank={{
          fluid_type: 'grey_water',
          capacity_l: 100,
          level_pct: 40,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 15,
          last_empty_at: latch,
        }}
      />,
    )
    const column = screen.getByTestId('tank-info-column')
    expect(column).toHaveTextContent('Fill Rate')
    expect(column).not.toHaveTextContent('Drain Rate')
    expect(column).toHaveTextContent('3.0 L/h')
  })

  it('shows the level Status row worded and colored by alarm direction/zone, hidden with no alarm configured', () => {
    const { rerender } = render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 15,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          alarm_direction: 'low',
          alarm_threshold_pct: 20,
          alarm_restore_pct: 40,
        }}
      />,
    )
    let column = screen.getByTestId('tank-info-column')
    expect(column).toHaveTextContent('Status')
    expect(column).toHaveTextContent('Low')

    rerender(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 80,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    column = screen.getByTestId('tank-info-column')
    expect(column).not.toHaveTextContent('Status')
  })

  it('agrees the header Badge (green) with the Status row (default theme text, not an explicit color) at a 100% full, low-direction fresh water tank', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 100,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          alarm_direction: 'low',
          alarm_threshold_pct: 27,
          alarm_restore_pct: 48,
        }}
      />,
    )
    const header = screen.getByTestId('tank-card').querySelector('[data-slot="card-header"]') as HTMLElement
    const badge = within(header).getByText('Full')
    expect(badge.className).toContain('success')

    const column = screen.getByTestId('tank-info-column')
    const status = within(column).getByText('Full')
    expect(status.getAttribute('style')).toBeNull()
  })
})

describe('TankCard liquid color', () => {
  it('fills blue in the normal band', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 62,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          alarm_direction: 'low',
          alarm_threshold_pct: 27,
          alarm_restore_pct: 48,
        }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--accent)' })
  })

  it('fills red at/past the alarm threshold', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 27,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          alarm_direction: 'low',
          alarm_threshold_pct: 27,
          alarm_restore_pct: 48,
        }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--bad)' })
  })

  it('fills amber in the threshold→restore band', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 35,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          alarm_direction: 'low',
          alarm_threshold_pct: 27,
          alarm_restore_pct: 48,
        }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--warn)' })
  })

  it('fills red while the bus reports a committed alarm, even past restore', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 62,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          alarm_state: 'alarm',
        }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--bad)' })
  })

  it('fills red for a sensor fault regardless of level', () => {
    render(
      <TankCard
        id="grey"
        tank={{
          fluid_type: 'grey_water',
          capacity_l: 80,
          level_pct: 95,
          status: 'short_circuit',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--bad)' })
  })

  it('fills in the fluid\'s own color (not accent blue) for a tank with no alarm config and no alarm on the wire', () => {
    render(
      <TankCard
        id="fuel"
        tank={{
          fluid_type: 'fuel',
          capacity_l: 60,
          level_pct: 8,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--color-amber-600)' })
  })

  it('fills each fluid type with its configured normal-band color (fresh/grey water share the accent blue)', () => {
    const { rerender } = render(
      <TankCard
        id="t"
        tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 50, status: 'ok', volume_since_full_l: 0, volume_since_empty_l: 0 }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--accent)' })

    rerender(
      <TankCard
        id="t"
        tank={{ fluid_type: 'grey_water', capacity_l: 100, level_pct: 50, status: 'ok', volume_since_full_l: 0, volume_since_empty_l: 0 }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--accent)' })

    rerender(
      <TankCard
        id="t"
        tank={{ fluid_type: 'black_water', capacity_l: 100, level_pct: 50, status: 'ok', volume_since_full_l: 0, volume_since_empty_l: 0 }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--color-stone-800)' })

    rerender(
      <TankCard
        id="t"
        tank={{ fluid_type: 'lpg', capacity_l: 100, level_pct: 50, status: 'ok', volume_since_full_l: 0, volume_since_empty_l: 0 }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--color-orange-500)' })
  })

  it('still overrides to red/amber by alarm severity regardless of fluid type', () => {
    render(
      <TankCard
        id="t"
        tank={{
          fluid_type: 'fuel',
          capacity_l: 100,
          level_pct: 20,
          status: 'ok',
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          alarm_direction: 'low',
          alarm_threshold_pct: 27,
          alarm_restore_pct: 48,
        }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--bad)' })
  })
})
