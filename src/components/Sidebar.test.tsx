import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tabs as TabsRoot } from './ui/tabs'
import { Sidebar, type NavItem } from './Sidebar'

const items: NavItem[] = [
  { id: 'tanks', label: 'Tanks', icon: <span data-testid="icon-tanks" /> },
  { id: 'power', label: 'Power', icon: <span data-testid="icon-power" /> },
]

function renderSidebar(collapsed: boolean, onToggleCollapsed = vi.fn()) {
  return render(
    <TabsRoot value="tanks" onValueChange={() => {}} orientation="vertical">
      <Sidebar items={items} collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
    </TabsRoot>,
  )
}

describe('Sidebar', () => {
  it('shows icon and label for every item when expanded', () => {
    renderSidebar(false)
    expect(screen.getByTestId('icon-tanks')).toBeInTheDocument()
    expect(screen.getByText('Tanks')).toBeInTheDocument()
    expect(screen.getByText('Power')).toBeInTheDocument()
  })

  it('shows only icons, no labels, when collapsed', () => {
    renderSidebar(true)
    expect(screen.getByTestId('icon-tanks')).toBeInTheDocument()
    expect(screen.queryByText('Tanks')).not.toBeInTheDocument()
    expect(screen.queryByText('Power')).not.toBeInTheDocument()
  })

  it('marks the active nav item selected', () => {
    renderSidebar(false)
    expect(screen.getByTestId('nav-tanks')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('nav-power')).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onToggleCollapsed when the toggle button is clicked', async () => {
    const onToggleCollapsed = vi.fn()
    renderSidebar(false, onToggleCollapsed)
    await userEvent.click(screen.getByTestId('sidebar-toggle'))
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1)
  })

  it('labels the toggle button by its resulting action', () => {
    const { rerender } = renderSidebar(false)
    expect(screen.getByTestId('sidebar-toggle')).toHaveAccessibleName('Collapse sidebar')

    rerender(
      <TabsRoot value="tanks" onValueChange={() => {}} orientation="vertical">
        <Sidebar items={items} collapsed onToggleCollapsed={() => {}} />
      </TabsRoot>,
    )
    expect(screen.getByTestId('sidebar-toggle')).toHaveAccessibleName('Expand sidebar')
  })
})
