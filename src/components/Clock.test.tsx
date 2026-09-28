import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Clock } from './Clock'

describe('Clock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the current time as HH:MM', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 9, 5))
    render(<Clock />)
    expect(screen.getByTestId('clock')).toHaveTextContent('09:05')
  })

  it('zero-pads single-digit hours and minutes', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 0, 0))
    render(<Clock />)
    expect(screen.getByTestId('clock')).toHaveTextContent('00:00')
  })

  it('uses 24-hour time, not 12-hour AM/PM', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 23, 45))
    render(<Clock />)
    expect(screen.getByTestId('clock')).toHaveTextContent('23:45')
    expect(screen.queryByText(/pm/i)).not.toBeInTheDocument()
  })

  it('updates when the minute rolls over', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 9, 5, 59))
    render(<Clock />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByTestId('clock')).toHaveTextContent('09:06')
  })
})
