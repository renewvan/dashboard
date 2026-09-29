import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RouterStatusIcon } from './RouterStatusIcon'

describe('RouterStatusIcon', () => {
  it('is not a button — purely informational, nothing to tap', () => {
    render(<RouterStatusIcon status="connected" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('labels a disconnected state distinguishing it from live state', () => {
    render(<RouterStatusIcon status="disconnected" />)
    expect(screen.getByRole('img')).toHaveAccessibleName(/disconnected/i)
  })

  it('labels a connected state', () => {
    render(<RouterStatusIcon status="connected" />)
    expect(screen.getByRole('img')).toHaveAccessibleName(/connected/i)
  })

  it('labels a connecting state distinctly from connected/disconnected', () => {
    const { rerender } = render(<RouterStatusIcon status="connecting" />)
    expect(screen.getByRole('img')).toHaveAccessibleName(/connecting/i)

    rerender(<RouterStatusIcon status="disconnected" />)
    expect(screen.getByRole('img')).toHaveAccessibleName(/last-known state/i)
  })

  it('renders the router-off asset when disconnected', () => {
    render(<RouterStatusIcon status="disconnected" />)
    expect(screen.getByTestId('router-status-icon').querySelector('svg')).toBeInTheDocument()
  })
})
