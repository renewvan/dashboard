import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TankStatCard } from './TankStatCard'

describe('TankStatCard', () => {
  it('smoke-renders an ok tank', () => {
    render(
      <TankStatCard id="fresh" tank={{ fluid_type: 'fresh_water', capacity_l: 100, level_pct: 62, status: 'ok' }} />,
    )
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('62%')).toBeInTheDocument()
  })

  it('smoke-renders a faulted tank', () => {
    render(
      <TankStatCard
        id="grey"
        tank={{ fluid_type: 'grey_water', capacity_l: 80, level_pct: 0, status: 'open_circuit' }}
      />,
    )
    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByText('Sensor fault: open circuit')).toBeInTheDocument()
  })
})
