import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DisplayPowerButton } from './DisplayPowerButton'

describe('DisplayPowerButton', () => {
  it('labels as sleep when the display is on', () => {
    render(<DisplayPowerButton displayPower="on" onSleep={vi.fn()} onWake={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/sleep/i)
  })

  it('labels as wake when the display is off', () => {
    render(<DisplayPowerButton displayPower="off" onSleep={vi.fn()} onWake={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/wake/i)
  })

  it('calls onSleep when tapped while on', async () => {
    const user = userEvent.setup()
    const onSleep = vi.fn()
    render(<DisplayPowerButton displayPower="on" onSleep={onSleep} onWake={vi.fn()} />)
    await user.click(screen.getByRole('button'))
    expect(onSleep).toHaveBeenCalledOnce()
  })

  it('calls onWake when tapped while off', async () => {
    const user = userEvent.setup()
    const onWake = vi.fn()
    render(<DisplayPowerButton displayPower="off" onSleep={vi.fn()} onWake={onWake} />)
    await user.click(screen.getByRole('button'))
    expect(onWake).toHaveBeenCalledOnce()
  })

  it('disables until the retained display-power topic arrives', () => {
    render(<DisplayPowerButton displayPower={null} onSleep={vi.fn()} onWake={vi.fn()} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('meets the 44x44px minimum touch target for kiosk controls', () => {
    render(<DisplayPowerButton displayPower="on" onSleep={vi.fn()} onWake={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveClass('size-11')
  })
})
