import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

const tabs = [
  { id: 'tanks', label: 'Tanks', content: <div>Tanks panel</div> },
  { id: 'power', label: 'Power', content: <div>Power panel</div> },
  { id: 'switches', label: 'Switches', content: <div>Switches panel</div> },
]

describe('Tabs', () => {
  it('renders the active tab panel and marks the active tab selected', () => {
    render(<Tabs tabs={tabs} activeId="power" onSelect={vi.fn()} />)
    expect(screen.getByText('Power panel')).toBeInTheDocument()
    expect(screen.queryByText('Tanks panel')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Power' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Tanks' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onSelect with the clicked tab id', async () => {
    const onSelect = vi.fn()
    render(<Tabs tabs={tabs} activeId="tanks" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Switches' }))
    expect(onSelect).toHaveBeenCalledWith('switches')
  })
})
