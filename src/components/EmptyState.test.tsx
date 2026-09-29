import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders the title and icon', () => {
    render(<EmptyState icon={<span data-testid="icon" />} title="No tank data yet." />)
    expect(screen.getByText('No tank data yet.')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders an optional description', () => {
    render(
      <EmptyState
        icon={<span />}
        title="No tank data yet."
        description="Waiting for readings from the renewvan hub."
      />,
    )
    expect(
      screen.getByText('Waiting for readings from the renewvan hub.'),
    ).toBeInTheDocument()
  })

  it('omits the description when none is given', () => {
    render(<EmptyState icon={<span />} title="No tank data yet." />)
    expect(document.querySelector('[data-slot="empty-description"]')).not.toBeInTheDocument()
  })
})
