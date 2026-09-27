import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SleepOverlay } from './SleepOverlay'

describe('SleepOverlay', () => {
  it('renders the overlay when displayPower is "off"', () => {
    render(<SleepOverlay displayPower="off" onWake={() => {}} />)
    expect(screen.getByTestId('sleep-overlay')).toBeInTheDocument()
  })

  it('renders nothing when displayPower is "on"', () => {
    render(<SleepOverlay displayPower="on" onWake={() => {}} />)
    expect(screen.queryByTestId('sleep-overlay')).not.toBeInTheDocument()
  })

  it('renders nothing when displayPower is null (retained not yet received)', () => {
    render(<SleepOverlay displayPower={null} onWake={() => {}} />)
    expect(screen.queryByTestId('sleep-overlay')).not.toBeInTheDocument()
  })

  it('calls onWake on first pointerdown and removes the overlay', () => {
    const onWake = vi.fn()
    const { rerender } = render(<SleepOverlay displayPower="off" onWake={onWake} />)
    screen.getByTestId('sleep-overlay').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(onWake).toHaveBeenCalledTimes(1)

    // Simulate parent updating displayPower to "on" after onWake fires
    rerender(<SleepOverlay displayPower="on" onWake={onWake} />)
    expect(screen.queryByTestId('sleep-overlay')).not.toBeInTheDocument()
  })

  it('does not fire onWake a second time once displayPower is "on"', () => {
    const onWake = vi.fn()
    const { rerender } = render(<SleepOverlay displayPower="off" onWake={onWake} />)
    screen.getByTestId('sleep-overlay').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    rerender(<SleepOverlay displayPower="on" onWake={onWake} />)
    // overlay is gone — no second event possible
    expect(screen.queryByTestId('sleep-overlay')).not.toBeInTheDocument()
    expect(onWake).toHaveBeenCalledTimes(1)
  })
})
