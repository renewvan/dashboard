import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Battery } from '../types'
import { PowerTab } from './PowerTab'

// Fixture matches schema/battery.schema.json, including a charge_state
// outside the common bulk/absorption/float set, per ticket 06 /
// schema/examples/battery.charge-state-uncommon.valid.json.
const batteries: Record<string, Battery> = {
  house: {
    soc_pct: 78,
    voltage_v: 13.1,
    current_a: 4.2,
    power_w: 55,
    temperature_c: 22,
    charge_state: 'storage',
  },
}

describe('PowerTab', () => {
  it('renders SoC, signed current, and the charge_state badge', () => {
    render(<PowerTab batteries={batteries} />)
    expect(screen.getByText('78%')).toBeInTheDocument()
    expect(screen.getByText(/13\.1 V/)).toBeInTheDocument()
    expect(screen.getByText(/\+4\.2 A/)).toBeInTheDocument()
    expect(screen.getByText('storage')).toBeInTheDocument()
  })

  it('renders a negative sign for a discharging battery without double negatives', () => {
    render(
      <PowerTab
        batteries={{
          house: { soc_pct: 40, voltage_v: 12.4, current_a: -3.1, power_w: -38, temperature_c: 21, charge_state: 'discharging' },
        }}
      />,
    )
    expect(screen.getByText(/-3\.1 A/)).toBeInTheDocument()
  })

  it('shows an empty state with no battery data', () => {
    render(<PowerTab batteries={{}} />)
    expect(screen.getByText(/No battery data/)).toBeInTheDocument()
  })

  it('skips a still-partial battery record instead of crashing', () => {
    // MQTT builds an entity up one property per retained message; a
    // `health`-topic collision or a mid-flight connection can leave an id
    // with only some fields set. Rendering must not throw on the missing
    // ones (e.g. `undefined.toFixed`).
    render(
      <PowerTab
        batteries={{
          ...batteries,
          health: { soc_pct: 0 } as unknown as Battery,
        }}
      />,
    )
    expect(screen.getByText('78%')).toBeInTheDocument()
    expect(screen.queryByText(/Battery \(health\)/)).not.toBeInTheDocument()
  })
})
