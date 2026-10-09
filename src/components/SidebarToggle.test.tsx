import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SidebarToggle } from './SidebarToggle'

describe('SidebarToggle', () => {
  it('offers "Collapse sidebar" when expanded and requests collapsing', async () => {
    const onCollapsedChange = vi.fn()
    render(<SidebarToggle collapsed={false} onCollapsedChange={onCollapsedChange} />)
    const button = screen.getByRole('button', { name: 'Collapse sidebar' })
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(button)
    expect(onCollapsedChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('offers "Expand sidebar" when collapsed and requests expanding', async () => {
    const onCollapsedChange = vi.fn()
    render(<SidebarToggle collapsed onCollapsedChange={onCollapsedChange} />)
    const button = screen.getByRole('button', { name: 'Expand sidebar' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(button)
    expect(onCollapsedChange).toHaveBeenCalledExactlyOnceWith(false)
  })
})
