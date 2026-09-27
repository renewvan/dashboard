import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SettingsTab } from './SettingsTab'

describe('SettingsTab', () => {
  it('renders the sleep button', () => {
    render(<SettingsTab onSleep={() => {}} />)
    expect(screen.getByTestId('sleep-button')).toBeInTheDocument()
  })

  it('calls onSleep when the sleep button is clicked', async () => {
    const onSleep = vi.fn()
    render(<SettingsTab onSleep={onSleep} />)
    await userEvent.click(screen.getByTestId('sleep-button'))
    expect(onSleep).toHaveBeenCalledTimes(1)
  })
})
