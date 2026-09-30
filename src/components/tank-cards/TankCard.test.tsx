import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TankCard } from './TankCard'

describe('TankCard', () => {
  it('renders fluid label, badge, percentage, and liters for an ok tank', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 62,
          level_pct_smoothed: 62,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
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
    expect(screen.getByText('Tuesday 14 Jul 2026')).toBeInTheDocument()
  })

  it('shows "Last emptied" from last_empty_at for a non-fresh-water tank', () => {
    render(
      <TankCard
        id="grey"
        tank={{
          fluid_type: 'grey_water',
          capacity_l: 80,
          level_pct: 41,
          level_pct_smoothed: 41,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          last_empty_at: '2026-08-03T12:00:00+00:00',
        }}
      />,
    )
    expect(screen.getByText('Last emptied:')).toBeInTheDocument()
    expect(screen.getByText('Monday 3 Aug 2026')).toBeInTheDocument()
  })

  it('shows a placeholder dash when the tank has never latched full/empty', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 62,
          level_pct_smoothed: 62,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getByText('Last refilled:')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('displays level_pct_smoothed, not the raw level_pct, for the shown percentage and liters', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 58,
          level_pct_smoothed: 62,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getByText('62%')).toBeInTheDocument()
    expect(screen.getByText(/62\/100/)).toBeInTheDocument()
    expect(screen.queryByText('58%')).not.toBeInTheDocument()
  })

  it('shows a Fault badge and the fault reason for a faulted tank', () => {
    render(
      <TankCard
        id="grey"
        tank={{
          fluid_type: 'grey_water',
          capacity_l: 80,
          level_pct: 0,
          level_pct_smoothed: 0,
          status: 'open_circuit',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByText('Sensor fault: open circuit')).toBeInTheDocument()
  })

  it('clamps an out-of-range level_pct_smoothed into the displayed value', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 100,
          level_pct_smoothed: 140,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0)
  })

  it('clamps a negative level_pct_smoothed to zero', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 0,
          level_pct_smoothed: -5,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
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
          level_pct_smoothed: 50,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    for (const mark of ['100%', '75%', '25%', '0%']) {
      expect(screen.getByText(mark)).toBeInTheDocument()
    }
  })

  it('renders the telemetry info column with volume-since-latch fill/drain values', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 62,
          level_pct_smoothed: 62,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
          volume_since_full_l: 45.6,
          volume_since_empty_l: 12.3,
        }}
      />,
    )
    const column = screen.getByTestId('tank-info-column')
    for (const label of ['Temperature', 'Fill Rate', 'Drain Rate']) {
      expect(column).toHaveTextContent(label)
    }
    expect(column).toHaveTextContent('23°C')
    expect(column).toHaveTextContent('46 L')
    expect(column).toHaveTextContent('12 L')
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
          level_pct_smoothed: 62,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
          alarm_direction: 'low',
          alarm_threshold_pct: 27,
          alarm_restore_pct: 48,
        }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--kiosk-accent)' })
  })

  it('fills red at/past the alarm threshold', () => {
    render(
      <TankCard
        id="fresh"
        tank={{
          fluid_type: 'fresh_water',
          capacity_l: 100,
          level_pct: 27,
          level_pct_smoothed: 27,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
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
          level_pct_smoothed: 35,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
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
          level_pct_smoothed: 62,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
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
          level_pct_smoothed: 95,
          status: 'short_circuit',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--bad)' })
  })

  it('fills blue for a tank with no alarm config and no alarm on the wire', () => {
    render(
      <TankCard
        id="fuel"
        tank={{
          fluid_type: 'fuel',
          capacity_l: 60,
          level_pct: 8,
          level_pct_smoothed: 8,
          status: 'ok',
          fill_rate_lpm: 0,
          drain_rate_lpm: 0,
          volume_since_full_l: 0,
          volume_since_empty_l: 0,
        }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--kiosk-accent)' })
  })
})
