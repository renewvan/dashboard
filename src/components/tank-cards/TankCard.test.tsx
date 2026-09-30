import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TankCard } from './TankCard'

describe('TankCard', () => {
  it('renders fluid label, badge, percentage, and liters for an ok tank', () => {
    render(
      <TankCard id="fresh" tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 62, status: 'ok' }} />,
    )
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('62%')).toBeInTheDocument()
    expect(screen.getByText(/62\/100/)).toBeInTheDocument()
    expect(screen.getByText('Last refilled:')).toBeInTheDocument()
    expect(screen.getByText('Friday 14 Jul 2026')).toBeInTheDocument()
  })

  it('shows a Fault badge and the fault reason for a faulted tank', () => {
    render(
      <TankCard
        id="grey"
        tank={{ fluid_type: 'grey_water', capacity_l: 80, level_pct: 0, status: 'open_circuit' }}
      />,
    )
    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByText('Sensor fault: open circuit')).toBeInTheDocument()
  })

  it('clamps an out-of-range level_pct into the displayed value', () => {
    render(
      <TankCard id="fresh" tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 140, status: 'ok' }} />,
    )
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0)
  })

  it('clamps a negative level_pct to zero', () => {
    render(
      <TankCard id="fresh" tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: -5, status: 'ok' }} />,
    )
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
  })

  it('renders the full 100/75/50/25/0% tick-marked scale', () => {
    render(
      <TankCard id="fresh" tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 50, status: 'ok' }} />,
    )
    for (const mark of ['100%', '75%', '25%', '0%']) {
      expect(screen.getByText(mark)).toBeInTheDocument()
    }
  })

  it('renders the telemetry info column with fill and drain rates', () => {
    render(
      <TankCard id="fresh" tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 62, status: 'ok' }} />,
    )
    const column = screen.getByTestId('tank-info-column')
    for (const label of ['Temperature', 'Fill Rate', 'Drain Rate']) {
      expect(column).toHaveTextContent(label)
    }
    expect(column).toHaveTextContent('23°C')
    expect(column).toHaveTextContent('1200 LPM')
    expect(column).toHaveTextContent('900 LPM')
  })
})

describe('TankCard liquid color', () => {
  it('fills blue in the normal band', () => {
    render(
      <TankCard id="fresh" tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 62, status: 'ok' }} />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--kiosk-accent)' })
  })

  it('fills red at/past the alarm threshold', () => {
    render(
      <TankCard id="fresh" tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 18, status: 'ok' }} />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--bad)' })
  })

  it('fills amber in the threshold→restore band', () => {
    render(
      <TankCard id="fresh" tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 22, status: 'ok' }} />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--warn)' })
  })

  it('fills red while the bus reports a committed alarm, even past restore', () => {
    render(
      <TankCard
        id="fresh"
        tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 62, status: 'ok', alarm_state: 'alarm' }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--bad)' })
  })

  it('fills red for a sensor fault regardless of level', () => {
    render(
      <TankCard
        id="grey"
        tank={{ fluid_type: 'grey_water', capacity_l: 80, level_pct: 95, status: 'short_circuit' }}
      />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--bad)' })
  })

  it('fills blue for a tank with no alarm config and no alarm on the wire', () => {
    render(
      <TankCard id="fuel" tank={{ fluid_type: 'fuel', capacity_l: 60, level_pct: 8, status: 'ok' }} />,
    )
    expect(screen.getByTestId('tank-liquid')).toHaveStyle({ background: 'var(--kiosk-accent)' })
  })
})
