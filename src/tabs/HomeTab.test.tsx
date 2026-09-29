import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomeTab } from './HomeTab'

const completeTank = {
  fluid_type: 'fresh_water' as const,
  level_pct: 62,
  capacity_l: 100,
  status: 'ok' as const,
}

const completeBattery = {
  soc_pct: 80,
  voltage_v: 13.1,
  current_a: 2.4,
  power_w: 31,
  temperature_c: 21,
  charge_state: 'bulk' as const,
}

describe('HomeTab', () => {
  it('shows a Tanks section with tank data', () => {
    render(<HomeTab tanks={{ fresh: completeTank }} batteries={{}} />)
    expect(screen.getByText('Tanks')).toBeInTheDocument()
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
  })

  it('shows a Power section with battery data', () => {
    render(<HomeTab tanks={{}} batteries={{ house: completeBattery }} />)
    expect(screen.getByText('Power')).toBeInTheDocument()
    expect(screen.getByText(/Battery \(house\)/)).toBeInTheDocument()
  })

  it('shows a single combined empty state when neither has data yet, not two stacked', () => {
    render(<HomeTab tanks={{}} batteries={{}} />)
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument()
    expect(screen.queryByText('Tanks')).not.toBeInTheDocument()
    expect(screen.queryByText('Power')).not.toBeInTheDocument()
  })

  it('still shows each section normally, including its own empty state, once one has data', () => {
    render(<HomeTab tanks={{ fresh: completeTank }} batteries={{}} />)
    expect(screen.getByText('Tanks')).toBeInTheDocument()
    expect(screen.getByText('Power')).toBeInTheDocument()
    expect(screen.getByText(/no battery data yet/i)).toBeInTheDocument()
  })
})
