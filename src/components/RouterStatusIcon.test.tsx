import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RouterStatusIcon } from './RouterStatusIcon'

describe('RouterStatusIcon', () => {
  it('is a tappable status button carrying the state as its accessible name', () => {
    render(<RouterStatusIcon status="disconnected" />)
    expect(screen.getByRole('button', { name: /disconnected/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /last-known state/i })).toBeInTheDocument()
  })

  it('labels a connected state', () => {
    render(<RouterStatusIcon status="connected" />)
    expect(screen.getByRole('button', { name: 'renewvan hub connected' })).toBeInTheDocument()
  })

  it('labels a connecting state distinctly from connected/disconnected', () => {
    const { rerender } = render(<RouterStatusIcon status="connecting" />)
    expect(screen.getByRole('button', { name: /connecting to renewvan hub/i })).toBeInTheDocument()

    rerender(<RouterStatusIcon status="disconnected" />)
    expect(screen.getByRole('button', { name: /last-known state/i })).toBeInTheDocument()
  })

  it('renders the state-mapped SVG inside the trigger', () => {
    render(<RouterStatusIcon status="disconnected" />)
    expect(screen.getByTestId('router-status-icon').querySelector('svg')).toBeInTheDocument()
    expect(screen.getByTestId('router-status-icon')).toHaveAttribute('data-status', 'disconnected')
  })

  it('opens a popover repeating the state copy when tapped', async () => {
    const user = userEvent.setup()
    render(<RouterStatusIcon status="connected" />)
    await user.click(screen.getByRole('button', { name: 'renewvan hub connected' }))
    expect(await screen.findByText('renewvan hub connected')).toBeInTheDocument()
  })
})
