import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Tank } from '../../types'
import { TankStatCard } from './TankStatCard'

// Local fixture helper: fills in schema v0.4's newly-required fields with
// inert defaults (level_pct_smoothed mirrors level_pct so pre-existing
// percentage assertions keep working; TankStatCard itself still reads
// level_pct directly — unused prototype variant, out of scope to migrate).
function tank(overrides: Pick<Tank, 'fluid_type' | 'capacity_l' | 'level_pct' | 'status'> & Partial<Tank>): Tank {
  return {
    level_pct_smoothed: overrides.level_pct,
    fill_rate_lpm: 0,
    drain_rate_lpm: 0,
    volume_since_full_l: 0,
    volume_since_empty_l: 0,
    ...overrides,
  }
}

describe('TankStatCard', () => {
  it('smoke-renders an ok tank', () => {
    render(<TankStatCard id="fresh" tank={tank({ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 62, status: 'ok' })} />)
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('62%')).toBeInTheDocument()
  })

  it('smoke-renders a faulted tank', () => {
    render(
      <TankStatCard
        id="grey"
        tank={tank({ fluid_type: 'grey_water', capacity_l: 80, level_pct: 0, status: 'open_circuit' })}
      />,
    )
    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByText('Sensor fault: open circuit')).toBeInTheDocument()
  })
})
