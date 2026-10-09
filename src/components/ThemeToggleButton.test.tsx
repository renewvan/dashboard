import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemeToggleButton } from './ThemeToggleButton'

describe('ThemeToggleButton', () => {
  it('labels the action to switch to light while in dark theme', () => {
    render(<ThemeToggleButton theme="dark" onThemeChange={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/switch to light/i)
  })

  it('labels the action to switch to dark while in light theme', () => {
    render(<ThemeToggleButton theme="light" onThemeChange={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName(/switch to dark/i)
  })

  it('calls onThemeChange with light when tapped while dark', async () => {
    const user = userEvent.setup()
    const onThemeChange = vi.fn()
    render(<ThemeToggleButton theme="dark" onThemeChange={onThemeChange} />)
    await user.click(screen.getByRole('button'))
    expect(onThemeChange).toHaveBeenCalledWith('light')
  })

  it('calls onThemeChange with dark when tapped while light', async () => {
    const user = userEvent.setup()
    const onThemeChange = vi.fn()
    render(<ThemeToggleButton theme="light" onThemeChange={onThemeChange} />)
    await user.click(screen.getByRole('button'))
    expect(onThemeChange).toHaveBeenCalledWith('dark')
  })
})
