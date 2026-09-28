import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConnectionStatusButton } from './ConnectionStatusButton'

describe('ConnectionStatusButton', () => {
  it('labels a disconnected state distinguishing it from live state', () => {
    render(<ConnectionStatusButton status="disconnected" />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/disconnected/i)
  })

  it('labels a connected state', () => {
    render(<ConnectionStatusButton status="connected" />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/connected/i)
  })

  it('labels a connecting state distinctly from connected/disconnected', () => {
    const { rerender } = render(<ConnectionStatusButton status="connecting" />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/connecting/i)

    rerender(<ConnectionStatusButton status="disconnected" />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/last-known state/i)
  })

  it('meets the 44x44px minimum touch target for kiosk controls', () => {
    render(<ConnectionStatusButton status="connected" />)
    expect(screen.getByRole('button')).toHaveClass('size-11')
  })
})
