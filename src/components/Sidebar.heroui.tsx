import type { ReactNode } from 'react'
import { Tabs } from '@heroui/react'

export interface NavItem {
  id: string
  label: string
  icon: ReactNode
}

export interface SidebarProps {
  items: NavItem[]
  /**
   * Below the `md` breakpoint the same single tab list renders as a bottom
   * bar instead of a vertical rail. The caller decides (e.g. `useIsMobile()`)
   * and must give the `Tabs` root the matching `orientation`.
   */
  isMobile?: boolean
}

/**
 * Primary navigation: ONE HeroUI `Tabs.List`. The caller owns the `Tabs`
 * root and `selectedKey`, so it can also render the panels.
 *
 * Kiosk: a vertical rail in an `<aside>`, the last item (Settings) pushed to
 * the bottom with `mt-auto`.
 *
 * Mobile: the same list inside a bottom `<nav>`, tabs sharing the width
 * equally. The `<nav>` MUST precede the panels in the DOM (React Aria warns
 * when a tab panel is rendered before its tab list); `order-last` moves it
 * visually below them inside a flex-column parent, and the bottom padding
 * keeps it clear of the iOS home indicator.
 */
export function Sidebar({ items, isMobile = false }: SidebarProps) {
  const lastIndex = items.length - 1

  const list = (
    <Tabs.List aria-label="Navigation" className={isMobile ? 'w-full' : 'h-full'}>
      {items.map((item, index) => (
        <Tabs.Tab
          key={item.id}
          id={item.id}
          aria-label={item.label}
          data-testid={`nav-${item.id}`}
          className={
            isMobile
              ? 'data-[selected=true]:text-accent min-w-0 flex-1 px-0'
              : `data-[selected=true]:text-accent${index === lastIndex ? 'mt-auto' : ''}`
          }
        >
          {item.icon}
          <Tabs.Indicator />
        </Tabs.Tab>
      ))}
    </Tabs.List>
  )

  if (isMobile) {
    return (
      <nav
        aria-label="Primary"
        className="border-border bg-surface order-last shrink-0 border-t pb-[env(safe-area-inset-bottom)]"
      >
        {list}
      </nav>
    )
  }

  return <aside className="h-full shrink-0">{list}</aside>
}
