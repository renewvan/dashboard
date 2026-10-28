import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vite-plus/test'
import { DemoBadge } from './DemoBadge'

describe('DemoBadge', () => {
  it('is a plain pill, not a control, while nothing can be done with it', () => {
    render(<DemoBadge />)

    expect(screen.getByText('Demo')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('is a button with a 44px target that calls back when given a handler', async () => {
    const onPress = vi.fn()
    render(<DemoBadge onPress={onPress} />)

    const button = screen.getByRole('button', { name: /turn demo mode off/i })
    expect(button).toHaveClass('min-h-11', 'min-w-11')
    await userEvent.click(button)
    expect(onPress).toHaveBeenCalledOnce()
  })
})
