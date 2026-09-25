import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConnectionBanner } from './ConnectionBanner'

describe('ConnectionBanner', () => {
  it('shows a clear disconnected message distinguishing it from live state', () => {
    render(<ConnectionBanner status="disconnected" />)
    expect(screen.getByTestId('connection-banner')).toHaveTextContent(/disconnected/i)
  })

  it('shows a connected message when live', () => {
    render(<ConnectionBanner status="connected" />)
    expect(screen.getByTestId('connection-banner')).toHaveTextContent(/connected/i)
  })
})
