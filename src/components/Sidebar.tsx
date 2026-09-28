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
 * the simpler fallback design. The rail itself has no background — just
 * the theme wallpaper showing through (`App.tsx`) — only the pill
 * (`TabsList`, bordered capsule) carries its own near-opaque dark tint
 * (`bg-black/85`, plain alpha-blend, no `backdrop-filter`) so bright
 * wallpaper spots (e.g. the night photo's streetlight glow) can't bleed
 * through and distort the buttons' apparent shape. Icons sit vertically
 * centered in the rail's free height. Every button gets its own faint
 * circular background (`bg-white/10`) so unselected items still read as
 * distinct buttons, not bare floating glyphs; the selected item
 * additionally gets a solid accent-colored circular badge
 * (`.sidebar-nav [data-slot="tab-indicator"]` in `index.css`, reusing
 * Coss Tabs' built-in sliding indicator) matching each `TabsTab`'s forced
 * 44×44px size. Both `size-11!` and `justify-center!` (important) are
 * required because Base UI applies its own
 * `data-[orientation=vertical]:w-full` and
 * `data-[orientation=vertical]:justify-start` utilities, which win over
 * bare `size-11`/`justify-center` (attribute-selector specificity beats
 * a plain class) — without `!`, the tab collapses to its icon's
 * intrinsic size and left-aligns the icon inside it instead of centering
 * it. This was the real cause of a "button not centered" report
 * previously misdiagnosed as backdrop-blur bleed-through.
 */
export function Sidebar({ items }: SidebarProps) {
  return (
    <aside className="flex h-full w-18 shrink-0 flex-col items-center py-4">
      <img src={symbolWhite} alt="renewvan" className="h-7 w-7 shrink-0" />
      <div className="flex flex-1 items-center justify-center">
        <TabsList className="sidebar-nav dark flex-col items-center justify-start gap-5 rounded-full border border-white/10 bg-black/85 p-2">
          {items.map((item) => (
            <TabsTab
              key={item.id}
              value={item.id}
              data-testid={`nav-${item.id}`}
              aria-label={item.label}
              className="size-11! shrink-0 grow-0 justify-center! rounded-full bg-white/10 p-0 hover:bg-white/16"
            >
              {item.icon}
            </TabsTab>
          ))}
        </TabsList>
      </div>
    </aside>
  )
}
