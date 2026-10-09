import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AlertsButton } from './AlertsButton'

describe('AlertsButton', () => {
  it('is labelled plainly with no badge when nothing is unseen', () => {
    render(<AlertsButton onClick={vi.fn()} count={0} active={false} />)
    expect(screen.getByRole('button', { name: 'Alerts' })).toBeInTheDocument()
    expect(screen.queryByTestId('alerts-button-badge')).not.toBeInTheDocument()
  })

  it('shows the unseen count in the badge and the accessible name', () => {
    render(<AlertsButton onClick={vi.fn()} count={3} active={false} />)
    expect(screen.getByRole('button', { name: 'Alerts, 3 active' })).toBeInTheDocument()
    expect(screen.getByTestId('alerts-button-badge')).toHaveTextContent('3')
  })

  it('caps the badge at 9+ above nine', () => {
    render(<AlertsButton onClick={vi.fn()} count={10} active={false} />)
    expect(screen.getByTestId('alerts-button-badge')).toHaveTextContent('9+')
    expect(screen.getByRole('button', { name: 'Alerts, 10 active' })).toBeInTheDocument()
  })

  it('shows 9 as-is at the cap boundary', () => {
    render(<AlertsButton onClick={vi.fn()} count={9} active={false} />)
    expect(screen.getByTestId('alerts-button-badge')).toHaveTextContent(/^9$/)
  })

  it('marks the current page only while active', () => {
    const { rerender } = render(<AlertsButton onClick={vi.fn()} count={0} active={false} />)
    expect(screen.getByRole('button', { name: 'Alerts' })).not.toHaveAttribute('aria-current')
    rerender(<AlertsButton onClick={vi.fn()} count={0} active />)
    expect(screen.getByRole('button', { name: 'Alerts' })).toHaveAttribute('aria-current', 'page')
  })

  it('calls onClick once when tapped', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<AlertsButton onClick={onClick} count={2} active={false} />)
    await user.click(screen.getByTestId('alerts-button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
