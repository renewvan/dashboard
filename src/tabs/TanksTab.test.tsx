import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Tank } from '../types'
import { TanksTab } from './TanksTab'

// Local fixture helper: fills in schema-required fields with inert
// zero/empty defaults so each test only spells out what it exercises.
function tank(overrides: Pick<Tank, 'fluid_type' | 'capacity_l' | 'level_pct' | 'status'> & Partial<Tank>): Tank {
  return {
    fill_rate_lpm: 0,
    drain_rate_lpm: 0,
    volume_since_full_l: 0,
    volume_since_empty_l: 0,
    ...overrides,
  }
}

// Fixture shapes match schema/tank.schema.json + schema/examples/tank.valid.json.
const tanks: Record<string, Tank> = {
  grey: tank({ fluid_type: 'grey_water', capacity_l: 80, level_pct: 41, status: 'ok' }),
  fresh: tank({ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 62, status: 'ok' }),
}

describe('TanksTab', () => {
  it('renders a card per tank, fresh before grey regardless of input order', () => {
    render(<TanksTab tanks={tanks} />)
    const cards = screen.getAllByTestId('tank-card').map((el) => el.textContent)
    expect(cards[0]).toContain('Fresh water')
    expect(cards[1]).toContain('Grey water')
    expect(screen.getByText('62%')).toBeInTheDocument()
    expect(screen.getByText(/62\/100/)).toBeInTheDocument()
  })

  it('shows a green "Normal" badge for an ok tank and a red "Fault" badge for a faulted one', () => {
    render(
      <TanksTab
        tanks={{
          fresh: tank({ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 50, status: 'ok' }),
          grey: tank({ fluid_type: 'grey_water', capacity_l: 80, level_pct: 0, status: 'open_circuit' }),
        }}
      />,
    )
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('Fault')).toBeInTheDocument()
  })

  it('surfaces a sensor-fault status instead of liters remaining', () => {
    render(
      <TanksTab
        tanks={{ fresh: tank({ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 0, status: 'open_circuit' }) }}
      />,
    )
    expect(screen.getByText(/Sensor fault: open circuit/)).toBeInTheDocument()
  })

  it('surfaces a short_circuit fault status too', () => {
    render(
      <TanksTab
        tanks={{ grey: tank({ fluid_type: 'grey_water', capacity_l: 80, level_pct: 0, status: 'short_circuit' }) }}
      />,
    )
    expect(screen.getByText(/Sensor fault: short circuit/)).toBeInTheDocument()
  })

  it('shows an empty state with no tank data', () => {
    render(<TanksTab tanks={{}} />)
    expect(screen.getByText(/No tank data/)).toBeInTheDocument()
  })

  it('skips a still-partial tank record instead of rendering garbage', () => {
    // MQTT builds an entity up one property per retained message; a
    // `health`-topic collision or a mid-flight connection can leave an id
    // with only some fields set.
    render(
      <TanksTab
        tanks={{
          ...tanks,
          health: { status: 'ok' } as unknown as Tank,
        }}
      />,
    )
    expect(screen.getAllByTestId('tank-card')).toHaveLength(2)
  })

  it('renders a single tank without a grid gap (grid not hardcoded to 2)', () => {
    render(<TanksTab tanks={{ fresh: tanks.fresh }} />)
    expect(screen.getAllByTestId('tank-card')).toHaveLength(1)
  })

  it('renders three tanks in one grid (grid not hardcoded to 2)', () => {
    render(
      <TanksTab
        tanks={{
          ...tanks,
          black: tank({ fluid_type: 'black_water', capacity_l: 60, level_pct: 10, status: 'ok' }),
        }}
      />,
    )
    expect(screen.getAllByTestId('tank-card')).toHaveLength(3)
  })
})
