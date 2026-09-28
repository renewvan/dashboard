import type { ReactNode } from 'react'
import symbolWhite from '../../assets/logo/renewvan-symbol-white.svg'
import { TabsList, TabsTab } from '@/components/ui/tabs'

export interface NavItem {
  id: string
  label: string
  icon: ReactNode
}

export interface SidebarProps {
  items: NavItem[]
}

/**
 * Left nav rail: brand mark, a vertical Coss `Tabs` list (selection state
 * lives on the `Tabs.Root` this renders inside of, in `App.tsx`). Fixed
 * narrow width, icons only, no expand/collapse — the earlier
 * icon+label/collapsible version measured too wide for a 7" kiosk; this is
 * the simpler fallback design. The selected item gets a solid circular
 * badge (`.sidebar-nav [data-slot="tab-indicator"]` in `index.css`,
 * reusing Coss Tabs' built-in sliding indicator) sized to match the
 * 44×44px touch target per `docs/design-principles.md`.
 *
 * Stays dark regardless of the light/dark theme toggle (`App.tsx`'s
 * `theme` state only wraps the main content area in `.dark`) — same as
 * the reference's rail, which never lightens with the content. Scoping
 * `.dark` here re-anchors every kiosk/Coss CSS var for this subtree only,
 * independent of the ancestor's theme class (plain CSS custom-property
 * cascade, not Tailwind's `dark:` variant). Keeps the white logo mark
 * legible without a second light-theme variant.
 */
export function Sidebar({ items }: SidebarProps) {
  return (
    <aside className="sidebar-rail dark flex h-full w-18 shrink-0 flex-col items-center py-4">
      <img src={symbolWhite} alt="renewvan" className="h-7 w-7 shrink-0" />
      <div className="flex flex-1 items-center justify-center">
        <TabsList className="sidebar-nav flex-col items-center justify-start gap-5 rounded-none bg-transparent p-0">
          {items.map((item) => (
            <TabsTab
              key={item.id}
              value={item.id}
              data-testid={`nav-${item.id}`}
              aria-label={item.label}
              className="size-11 justify-center rounded-full p-0"
            >
              {item.icon}
            </TabsTab>
          ))}
        </TabsList>
      </div>
    </aside>
  )
}
