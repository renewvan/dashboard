import type { ReactNode } from 'react'
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
 * Left nav rail: a vertical Coss `Tabs` list (selection state lives on the
 * `Tabs.Root` this renders inside of, in `App.tsx`). Fixed narrow width,
 * icons only, no expand/collapse — the earlier icon+label/collapsible
 * version measured too wide for a 7" kiosk; this is the simpler fallback
 * design. The brand mark used to live here but moved into its own
 * full-width header row above both the rail and the content pane
 * (`App.tsx`) so the full icon+wordmark lockup has room to render legibly
 * — 72px wasn't enough width for anything but the bare icon mark.
 *
 * The rail itself has no background — just the theme wallpaper showing
 * through (`App.tsx`) — only the pill (`TabsList`, bordered capsule)
 * carries a surface, matching the main content pane's and header's own
 * treatment (`bg-card/40 backdrop-blur-md border-white/10`) rather than a
 * fixed dark tint, so the rail visually belongs to whichever theme is
 * active instead of always reading as a separate dark strip. `items-start`
 * (not `items-center`) plus `w-fit` (not a fixed `w-18`) on the rail:
 * the pill is narrower than 72px once you account for its own padding,
 * so a fixed-width rail left ~10px of dead space to the pill's right
 * that the header (which fills its whole grid column, no narrower inner
 * element) doesn't have — the sidebar-to-content gap visually read
 * bigger than the header-to-content gap even though the flex `gap-3`
 * between them was identical the whole time. `w-fit` makes the rail's
 * column always hug the pill's actual rendered width, so both edges
 * (aside's right edge and the pill's right edge) are the same edge,
 * structurally — not a hardcoded width that can drift out of sync with
 * the pill again later.
 *
 * Icons sit vertically centered in the rail's full height. `item.icon`
 * MUST carry an explicit `size-*` class (see `App.tsx`'s `NAV_ITEMS`) —
 * Coss's shared `segmentedControlItemLayoutClassName` (used by
 * `TabsTab`, from `@/lib/segmented-control`) applies
 * `[&_svg:not([class*='size-'])]:size-4.5 sm:size-4` to any *unsized*
 * child svg, silently shrinking a bare `<Droplet />`-style icon to 16px
 * at the `sm` breakpoint — this was the actual cause of a "sidebar
 * icons look smaller than the header" report, not a font-size/padding
 * difference. Giving the icon its own `size-*` class (matching the
 * header controls' `size-6`, 24px) excludes it from that rule.
 * Inactive icons keep the base Coss Tabs muted-gray color (ancestor
 * `text-muted-foreground` on `TabsList`) — only the active/selected icon
 * is forced white
 * (`data-active:text-white!`) regardless of theme, since it sits on the
 * solid accent-colored badge and needs guaranteed contrast there; gray
 * was already fine for inactive icons against the pill's own tint.
 * `!important` is needed to beat `data-active:text-foreground`, an
 * attribute selector with the same specificity trick already hit by
 * `size-11!`/`justify-center!` on this element. Every button gets its
 * own faint circular background (`bg-foreground/10`, adaptive per theme)
 * so unselected items still read as distinct buttons, not bare floating
 * glyphs; the selected item additionally gets a solid accent-colored
 * circular badge (`.sidebar-nav [data-slot="tab-indicator"]` in
 * `index.css`, reusing Coss Tabs' built-in sliding indicator) matching
 * each `TabsTab`'s forced 44×44px size. Both `size-11!` and
 * `justify-center!` (important) are required because Base UI applies its
 * own `data-[orientation=vertical]:w-full` and
 * `data-[orientation=vertical]:justify-start` utilities, which win over
 * bare `size-11`/`justify-center` (attribute-selector specificity beats a
 * plain class) — without `!`, the tab collapses to its icon's intrinsic
 * size and left-aligns the icon inside it instead of centering it.
 */
export function Sidebar({ items }: SidebarProps) {
  return (
    <aside className="flex h-full w-fit shrink-0 flex-col items-start justify-center">
      <TabsList className="sidebar-nav flex-col items-center justify-start gap-5 rounded-full border border-white/10 bg-card/40 p-2 backdrop-blur-md">
        {items.map((item) => (
          <TabsTab
            key={item.id}
            value={item.id}
            data-testid={`nav-${item.id}`}
            aria-label={item.label}
            className="size-11! shrink-0 grow-0 justify-center! rounded-full bg-foreground/10 p-0 hover:bg-foreground/16 data-active:text-white!"
          >
            {item.icon}
          </TabsTab>
        ))}
      </TabsList>
    </aside>
  )
}
