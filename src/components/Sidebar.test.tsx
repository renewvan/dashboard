import { render, screen, within } from '@testing-library/react'
import { Tabs } from '@heroui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import { Sidebar, type NavItem } from './Sidebar'

// HeroUI's Tabs read window.matchMedia (absent in jsdom).
let viewport: MatchMediaStub

beforeEach(() => {
  viewport = stubMatchMedia(1024)
})

const items: NavItem[] = [
  { id: 'tanks', label: 'Tanks', icon: <span data-testid="icon-tanks" /> },
  { id: 'power', label: 'Power', icon: <span data-testid="icon-power" /> },
  { id: 'settings', label: 'Settings', icon: <span data-testid="icon-settings" /> },
]

function renderSidebar({
  isMobile = false,
  selectedKey = 'tanks',
  collapsed = false,
  theme,
}: {
  isMobile?: boolean
  selectedKey?: string
  collapsed?: boolean
  theme?: 'light' | 'dark'
} = {}) {
  return render(
    <Tabs
      selectedKey={selectedKey}
      onSelectionChange={() => {}}
      orientation={isMobile ? 'horizontal' : 'vertical'}
    >
      <Sidebar items={items} isMobile={isMobile} collapsed={collapsed} theme={theme} />
      <Tabs.Panel id="tanks">Tanks panel</Tabs.Panel>
      <Tabs.Panel id="power">Power panel</Tabs.Panel>
      <Tabs.Panel id="settings">Settings panel</Tabs.Panel>
    </Tabs>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  viewport.restore()
})

describe.each([
  { name: 'rail', isMobile: false },
  { name: 'bottom bar', isMobile: true },
])('Sidebar ($name)', ({ isMobile }) => {
  it('renders an icon for every item', () => {
    renderSidebar({ isMobile })
    for (const item of items) {
      expect(screen.getByTestId(`icon-${item.id}`)).toBeInTheDocument()
    }
  })

  it('renders text labels only in the expanded rail', () => {
    renderSidebar({ isMobile, collapsed: false })
    // Panels carry their own text; match the label spans inside the tabs.
    for (const item of items) {
      const label = within(screen.getByTestId(`nav-${item.id}`)).queryByText(item.label)
      if (isMobile) expect(label).not.toBeInTheDocument()
      else expect(label).toBeInTheDocument()
    }
  })

  it('never renders text labels when collapsed or on the bottom bar', () => {
    renderSidebar({ isMobile, collapsed: true })
    for (const item of items) {
      expect(within(screen.getByTestId(`nav-${item.id}`)).queryByText(item.label)).toBeNull()
    }
  })

  it('labels each tab for accessibility despite no visible text', () => {
    renderSidebar({ isMobile })
    for (const item of items) {
      expect(screen.getByRole('tab', { name: item.label })).toBe(
        screen.getByTestId(`nav-${item.id}`),
      )
    }
  })

  it('marks only the selected tab as selected', () => {
    renderSidebar({ isMobile, selectedKey: 'power' })
    expect(screen.getByTestId('nav-power')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('nav-tanks')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByTestId('nav-settings')).toHaveAttribute('aria-selected', 'false')
  })

  it('renders exactly one tablist', () => {
    renderSidebar({ isMobile })
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
  })

  it('keeps Settings as the last tab', () => {
    renderSidebar({ isMobile })
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(items.length)
    expect(tabs.at(-1)).toHaveAccessibleName('Settings')
  })

  it('does not warn about a tab panel rendered before the tab list', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderSidebar({ isMobile })
    const messages = [...warn.mock.calls, ...error.mock.calls].map((args) => args.join(' '))
    expect(messages.filter((m) => /tab panel|tab id/i.test(m))).toEqual([])
  })
})

describe('Sidebar (bottom bar)', () => {
  it('puts the tablist in a navigation landmark that precedes the panel', () => {
    renderSidebar({ isMobile: true })
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(nav).toContainElement(screen.getByRole('tablist'))
    expect(
      nav.compareDocumentPosition(screen.getByRole('tabpanel')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})

describe('Sidebar (rail brand)', () => {
  it('renders the same single lockup whether expanded or collapsed', () => {
    const { unmount } = renderSidebar({ collapsed: false })
    const expanded = screen.getByRole('img', { name: 'renewvan' }).getAttribute('src')
    expect(expanded).toMatch(/lockup/)
    unmount()

    renderSidebar({ collapsed: true })
    expect(screen.getAllByRole('img', { name: 'renewvan' })).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'renewvan' }).getAttribute('src')).toBe(expanded)
  })

  it('picks the lockup variant for the theme', () => {
    const { unmount } = renderSidebar({ theme: 'dark' })
    const dark = screen.getByRole('img', { name: 'renewvan' }).getAttribute('src')
    unmount()
    renderSidebar({ theme: 'light' })
    const light = screen.getByRole('img', { name: 'renewvan' }).getAttribute('src')
    expect(dark).not.toBe(light)
  })

  it('keeps every nav item as a tab when collapsed', () => {
    renderSidebar({ collapsed: true })
    expect(screen.getAllByRole('tab')).toHaveLength(items.length)
    expect(screen.getByRole('complementary')).toHaveAttribute('data-state', 'collapsed')
  })

  it('has no brand on the bottom bar (the header carries it)', () => {
    renderSidebar({ isMobile: true })
    expect(screen.queryByRole('img', { name: 'renewvan' })).not.toBeInTheDocument()
  })
})
