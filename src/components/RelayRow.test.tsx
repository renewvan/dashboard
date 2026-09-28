import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RelayRow } from './RelayRow'

describe('RelayRow', () => {
  it('shows the label and a checked switch when the relay is on', () => {
    render(<RelayRow label="Ceiling lights" state />)
    expect(screen.getByText('Ceiling lights')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Ceiling lights' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('shows an unchecked switch when the relay is off', () => {
    render(<RelayRow label="Awning lights" state={false} />)
    expect(screen.getByRole('switch', { name: 'Awning lights' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('renders the switch read-only, with no toggle affordance', () => {
    render(<RelayRow label="Water pump" state={false} />)
    expect(screen.getByRole('switch', { name: 'Water pump' })).toHaveAttribute(
      'aria-readonly',
      'true',
    )
  })
})
