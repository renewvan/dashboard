import { render, screen, within } from '@testing-library/react'
import { Tabs } from '@heroui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
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
}: {
  isMobile?: boolean
  selectedKey?: string
} = {}) {
  return render(
    <Tabs
      selectedKey={selectedKey}
      onSelectionChange={() => {}}
      orientation={isMobile ? 'horizontal' : 'vertical'}
    >
      <Sidebar items={items} isMobile={isMobile} />
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

  it('never renders visible text labels', () => {
    renderSidebar({ isMobile })
    // Panels carry their own text; match the label spans inside the tabs.
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

describe('Sidebar (brand)', () => {
  it('renders no brand, rail or bottom bar: the app header carries it', () => {
    const { unmount } = renderSidebar()
    expect(screen.queryByRole('img', { name: 'renewvan' })).not.toBeInTheDocument()
    unmount()
    renderSidebar({ isMobile: true })
    expect(screen.queryByRole('img', { name: 'renewvan' })).not.toBeInTheDocument()
  })

  it('is a closed icon rail in a complementary landmark on the kiosk', () => {
    renderSidebar()
    expect(screen.getByRole('complementary')).toContainElement(screen.getByRole('tablist'))
  })
})
