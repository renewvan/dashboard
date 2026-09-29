import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconSwitch } from './IconSwitch'

describe('IconSwitch', () => {
  it('labels the switch via its accessible name, not visible text', () => {
    render(
      <IconSwitch
        id="test-toggle"
        icon={<span data-testid="icon" />}
        checked={false}
        onCheckedChange={vi.fn()}
        ariaLabel="Dark theme"
      />,
    )
    expect(screen.getByRole('switch')).toHaveAccessibleName('Dark theme')
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('reflects checked state', () => {
    render(
      <IconSwitch
        id="test-toggle"
        icon={<span />}
        checked
        onCheckedChange={vi.fn()}
        ariaLabel="Dark theme"
      />,
    )
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('toggles when the row (not just the switch) is clicked, fat-fingers/gloves target', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(
      <IconSwitch
        id="test-toggle"
        icon={<span data-testid="icon" />}
        checked={false}
        onCheckedChange={onCheckedChange}
        ariaLabel="Dark theme"
      />,
    )
    await user.click(screen.getByTestId('icon'))
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything())
  })

  it('meets the 44px minimum touch-target height', () => {
    render(
      <IconSwitch
        id="test-toggle"
        icon={<span />}
        checked={false}
        onCheckedChange={vi.fn()}
        ariaLabel="Dark theme"
        testId="test-toggle-switch"
      />,
    )
    expect(screen.getByTestId('test-toggle-switch').closest('label')).toHaveClass('h-11')
  })
})
