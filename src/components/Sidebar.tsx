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
 * the simpler fallback design. Nav icons sit in a bordered capsule
 * (`rounded-full border` on the `TabsList`) floating vertically centered
 * in the rail's free height. Every button gets its own faint circular
 * background (`bg-white/8`) so unselected items still read as distinct
 * buttons, not bare floating glyphs; the selected item additionally gets
 * a solid accent-colored circular badge
 * (`.sidebar-nav [data-slot="tab-indicator"]` in `index.css`, reusing
 * Coss Tabs' built-in sliding indicator) matching each `TabsTab`'s forced
 * 44×44px size — `size-11!` (important) is required because Base UI's
 * own `data-[orientation=vertical]:w-full` class has higher CSS
 * specificity (class+attribute selector) than a bare `size-11`,
 * otherwise collapsing the tab to its icon's intrinsic size.
 *
 * Stays dark regardless of the light/dark theme toggle (`App.tsx`'s
 * `theme` state only wraps the main content area in `.dark`) — same as
 * the reference's rail, which never lightens with the content. Scoping
 * `.dark` here re-anchors every kiosk/Coss CSS var for this subtree only,
 * independent of the ancestor's theme class (plain CSS custom-property
 * cascade, not Tailwind's `dark:` variant). Keeps the white logo mark
 * legible without a second light-theme variant.
 *
 * `.sidebar-rail`'s gradient (`index.css`) is 50% alpha, paired with
 * `backdrop-blur-md` here, so `App.tsx`'s theme wallpaper shows through
 * as frosted glass — same treatment as every other panel surface
 * (`Card`, `Alert`, `SettingsTab`, `RelayRow`).
 */
export function Sidebar({ items }: SidebarProps) {
  return (
    <aside className="sidebar-rail dark flex h-full w-18 shrink-0 flex-col items-center py-4 backdrop-blur-md">
      <img src={symbolWhite} alt="renewvan" className="h-7 w-7 shrink-0" />
      <div className="flex flex-1 items-center justify-center">
        <TabsList className="sidebar-nav flex-col items-center justify-start gap-5 rounded-full border border-white/10 bg-white/5 p-2">
          {items.map((item) => (
            <TabsTab
              key={item.id}
              value={item.id}
              data-testid={`nav-${item.id}`}
              aria-label={item.label}
              className="size-11! shrink-0 grow-0 justify-center rounded-full bg-white/8 p-0 hover:bg-white/12"
            >
              {item.icon}
            </TabsTab>
          ))}
        </TabsList>
      </div>
    </aside>
  )
}
