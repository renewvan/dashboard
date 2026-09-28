import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Tabs as TabsRoot } from './ui/tabs'
import { Sidebar, type NavItem } from './Sidebar'

const items: NavItem[] = [
  { id: 'tanks', label: 'Tanks', icon: <span data-testid="icon-tanks" /> },
  { id: 'power', label: 'Power', icon: <span data-testid="icon-power" /> },
]

function renderSidebar() {
  return render(
    <TabsRoot value="tanks" onValueChange={() => {}} orientation="vertical">
      <Sidebar items={items} theme="dark" />
    </TabsRoot>,
  )
}

describe('Sidebar', () => {
  it('renders an icon for every item', () => {
    renderSidebar()
    expect(screen.getByTestId('icon-tanks')).toBeInTheDocument()
    expect(screen.getByTestId('icon-power')).toBeInTheDocument()
  })

  it('never renders text labels (icon-only rail)', () => {
    renderSidebar()
    expect(screen.queryByText('Tanks')).not.toBeInTheDocument()
    expect(screen.queryByText('Power')).not.toBeInTheDocument()
  })

  it('labels each nav item for accessibility despite no visible text', () => {
    renderSidebar()
    expect(screen.getByTestId('nav-tanks')).toHaveAccessibleName('Tanks')
    expect(screen.getByTestId('nav-power')).toHaveAccessibleName('Power')
  })

  it('marks the active nav item selected', () => {
    renderSidebar()
    expect(screen.getByTestId('nav-tanks')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('nav-power')).toHaveAttribute('aria-selected', 'false')
  })
})
