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
 * (`bg-black/85`, plain alpha-blend, no `backdrop-filter`). A lighter,
 * more transparent pill let bright wallpaper spots (e.g. the night
 * photo's streetlight glow) bleed through unevenly behind the small
 * circular buttons, reading as an optical illusion of off-center/
 * elliptical shapes even though every button measures a true centered
 * 44×44 circle (verified via exact-boundingbox screenshot crop) — high
 * opacity makes the pill's own surface dominate regardless of what's
 * behind it. `backdrop-blur` was tried and dropped too: stacking it on
 * an already-blurred wallpaper layer (`App.tsx` pre-blurs it once,
 * globally) only compounded the effect. Icons sit vertically centered in
 * the rail's free height. Every button gets its own faint circular
 * background (`bg-white/10`) so unselected items still read as distinct
 * buttons, not bare floating glyphs; the selected item additionally gets
 * a solid accent-colored circular badge
 * (`.sidebar-nav [data-slot="tab-indicator"]` in `index.css`, reusing
 * Coss Tabs' built-in sliding indicator) matching each `TabsTab`'s forced
 * 44×44px size — `size-11!` (important) is required because Base UI's
 * own `data-[orientation=vertical]:w-full` class has higher CSS
 * specificity (class+attribute selector) than a bare `size-11`,
 * otherwise collapsing the tab to its icon's intrinsic size.
 *
 * Only the pill carries `.dark` (re-anchoring every kiosk/Coss CSS var
 * for that subtree via plain CSS custom-property cascade, not Tailwind's
 * `dark:` variant) so its icons/badge stay legible over either theme
 * wallpaper, independent of the app's own light/dark toggle. Keeps the
 * white logo mark legible without a second light-theme variant.
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
              className="size-11! shrink-0 grow-0 justify-center rounded-full bg-white/10 p-0 hover:bg-white/16"
            >
              {item.icon}
            </TabsTab>
          ))}
        </TabsList>
      </div>
    </aside>
  )
}
