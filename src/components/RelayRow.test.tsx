import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RelayRow } from './RelayRow'

describe('RelayRow', () => {
  it('shows the label and an "on" indicator when the relay is on', () => {
    render(<RelayRow label="Ceiling lights" state />)
    expect(screen.getByText('Ceiling lights')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'on' })).toBeInTheDocument()
  })

  it('shows an "off" indicator when the relay is off', () => {
    render(<RelayRow label="Awning lights" state={false} />)
    expect(screen.getByRole('status', { name: 'off' })).toBeInTheDocument()
  })
})
