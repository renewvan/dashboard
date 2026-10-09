import type { ReactNode } from 'react'
import { Tabs } from '@heroui/react'
import lockupLight from '../../assets/logo/svg/renewvan-lockup-light.svg'
import lockupDark from '../../assets/logo/svg/renewvan-lockup-dark.svg'
import { cn } from '@/lib/utils'
import type { Theme } from '@/hooks/useTheme'

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
  /** Kiosk rail only: icon-only rounded buttons instead of icon + label rows. */
  collapsed?: boolean
  /** Picks the lockup variant that reads on the current surface. */
  theme?: Theme
}

/**
 * Primary navigation: ONE HeroUI `Tabs.List`. The caller owns the `Tabs`
 * root and `selectedKey`, so it can also render the panels.
 *
 * Kiosk: a full-height collapsible rail in an `<aside>`. The brand sits at
 * the top — the same lockup image always; collapsing clips it to the van
 * mark and hides the wordmark (one `img` named "renewvan" either way). Expanded
 * shows icon + label rows; collapsed shows rounded icon-only buttons (the
 * accessible name stays on each tab via `aria-label`). The last item
 * (Settings) is pushed to the bottom with `mt-auto`. The collapse toggle
 * lives in the app header, not here.
 *
 * Mobile: the same list inside a bottom `<nav>`, tabs sharing the width
 * equally, icon-only; no collapse, no brand (the header carries it). The
 * `<nav>` MUST precede the panels in the DOM (React Aria warns when a tab
 * panel is rendered before its tab list); `order-last` moves it visually
 * below them inside a flex-column parent, and the bottom padding keeps it
 * clear of the iOS home indicator.
 */
export function Sidebar({
  items,
  isMobile = false,
  collapsed = false,
  theme = 'dark',
}: SidebarProps) {
  const lastIndex = items.length - 1
  const showLabels = !isMobile && !collapsed

  const list = (
    <Tabs.List
      aria-label="Navigation"
      className={cn(
        isMobile ? 'w-full' : 'min-h-0 flex-1 items-center',
        // HeroUI styles the list as a pill-shaped segmented control; the rail
        // is a plain column, so drop the container chrome and let rows breathe.
        !isMobile && 'bg-transparent!',
      )}
    >
      {items.map((item, index) => (
        <Tabs.Tab
          key={item.id}
          id={item.id}
          aria-label={item.label}
          data-testid={`nav-${item.id}`}
          className={
            isMobile
              ? 'data-[selected=true]:text-accent min-w-0 flex-1 px-0'
              : cn(
                  'data-[selected=true]:text-accent h-11! min-w-0! gap-3',
                  showLabels ? 'justify-start! px-3!' : 'size-11! w-11! px-0!',
                  index === lastIndex && 'mt-auto',
                )
          }
        >
          {item.icon}
          {showLabels && <span className="truncate text-sm font-medium">{item.label}</span>}
          <Tabs.Indicator className={cn(!isMobile && 'bg-accent/15! rounded-full! shadow-none!')} />
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

  return (
    <aside
      data-state={collapsed ? 'collapsed' : 'expanded'}
      className={cn(
        'border-border bg-surface flex h-full shrink-0 flex-col gap-2 overflow-hidden border-r p-2 transition-[width] duration-200 motion-reduce:transition-none',
        collapsed ? 'w-[56px]' : 'w-42',
      )}
    >
      {/* One lockup, always. The van mark is the left ~27% of the artwork
          (text starts at x=144 of 480). At `h-8` the image is ~110px wide:
          mark ≈ 0–30px, wordmark from ≈ 33px. Collapsed, an inner window of
          exactly the mark's width (`w-[30px]`, centred in the 44px slot so it
          lines up with the nav icons) clips the wordmark away; expanded, the
          window grows to the full width and reveals it. */}
      <div
        className={cn(
          'flex shrink-0 items-center overflow-hidden transition-[width,padding] duration-200 motion-reduce:transition-none',
          collapsed ? 'justify-center' : 'w-full pl-4',
        )}
      >
        <div
          className={cn(
            'h-8 shrink-0 overflow-hidden transition-[width] duration-200 motion-reduce:transition-none',
            collapsed ? 'w-[30px]' : 'w-[110px]',
          )}
        >
          <img
            src={theme === 'dark' ? lockupDark : lockupLight}
            alt="renewvan"
            className="h-8 w-auto max-w-none"
          />
        </div>
      </div>
      {list}
    </aside>
  )
}
