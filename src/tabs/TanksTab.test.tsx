import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Tank } from '../types'
import { TanksTab } from './TanksTab'

// Fixture shapes match schema/tank.schema.json + schema/examples/tank.valid.json.
const tanks: Record<string, Tank> = {
  grey: { fluid_type: 'grey_water', capacity_l: 80, level_pct: 41, status: 'ok' },
  fresh: { fluid_type: 'fresh_water', capacity_l: 100, level_pct: 62, status: 'ok' },
}

describe('TanksTab', () => {
  it('renders a gauge per tank, fresh before grey regardless of input order', () => {
    render(<TanksTab tanks={tanks} />)
    const labels = screen.getAllByTestId('radial-gauge').map((el) => el.textContent)
    expect(labels[0]).toContain('Fresh water')
    expect(labels[1]).toContain('Grey water')
    expect(screen.getByText('62%')).toBeInTheDocument()
    expect(screen.getByText(/62\/100 L/)).toBeInTheDocument()
  })

  it('surfaces a sensor-fault status instead of liters remaining', () => {
    render(
      <TanksTab
        tanks={{ fresh: { fluid_type: 'fresh_water', capacity_l: 100, level_pct: 0, status: 'open_circuit' } }}
      />,
    )
    expect(screen.getByText(/Sensor fault: open circuit/)).toBeInTheDocument()
  })

  it('shows an empty state with no tank data', () => {
    render(<TanksTab tanks={{}} />)
    expect(screen.getByText(/No tank data/)).toBeInTheDocument()
  })
})
