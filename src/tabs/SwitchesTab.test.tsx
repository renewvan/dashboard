import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Relay } from '@/types'
import { SwitchesTab } from './SwitchesTab'

const relays: Record<string, Relay> = {
  lights_ceiling: { state: true },
  water_pump: { state: false },
}

describe('SwitchesTab', () => {
  it('renders a row per relay with the configured label', () => {
    render(<SwitchesTab relays={relays} />)
    expect(screen.getByText('Ceiling lights')).toBeInTheDocument()
    expect(screen.getByText('Water pump')).toBeInTheDocument()
  })

  it('falls back to the raw id for an unmapped relay', () => {
    render(<SwitchesTab relays={{ some_new_relay: { state: true } }} />)
    expect(screen.getByText('some_new_relay')).toBeInTheDocument()
  })

  it('shows an empty state with no relay data', () => {
    render(<SwitchesTab relays={{}} />)
    expect(screen.getByText(/No relay data/)).toBeInTheDocument()
  })
})
