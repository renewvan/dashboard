import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConnectionBanner } from './ConnectionBanner'

describe('ConnectionBanner', () => {
  it('shows a clear disconnected message distinguishing it from live state', () => {
    render(<ConnectionBanner status="disconnected" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/disconnected/i)
  })

  it('shows a connected message when live', () => {
    render(<ConnectionBanner status="connected" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/connected/i)
  })

  it('renders distinct alert content per connection status', () => {
    const { rerender } = render(<ConnectionBanner status="connecting" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/connecting/i)

    rerender(<ConnectionBanner status="disconnected" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/last-known state/i)
  })
})
