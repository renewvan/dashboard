import { useEffect, useState, type ReactNode } from 'react'
import { Pin, PinOff } from 'lucide-react'
import { Tabs } from '@heroui/react'
import { cn } from '@/lib/utils'
import { useAutoHide } from '@/hooks/useAutoHide'

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
  /** Kiosk rail only: called with `true` while the rail is slid away, so the parent can give its space back. */
  onHiddenChange?: (hidden: boolean) => void
}

/**
 * The rail's width (its border is inside the 56px, Tailwind boxes are border-box). The
 * parent pads the panes by this much while the rail is up.
 */
export const SIDEBAR_PAD_CLASS = 'pl-[56px]'

/**
 * Primary navigation: ONE HeroUI `Tabs.List`. The caller owns the `Tabs`
 * root and `selectedKey`, so it can also render the panels.
 *
 * Kiosk: a closed icon-only rail in an `<aside>` (the accessible name stays on
 * each tab via `aria-label`), sitting under the app header, which carries the brand.
 * The last item (Settings) is pushed to the bottom with `mt-auto`, and a pin button
 * sits under it. The rail slides away to the left after a few idle seconds and a touch
 * anywhere brings it back; the pin turns that off.
 *
 * Mobile: the same list inside a bottom `<nav>`, tabs sharing the width
 * equally, icon-only. The `<nav>` MUST precede the panels in the DOM (React
 * Aria warns when a tab panel is rendered before its tab list); `order-last`
 * moves it visually below them inside a flex-column parent, and the bottom
 * padding keeps it clear of the iOS home indicator.
 */
export function Sidebar({ items, isMobile = false, onHiddenChange }: SidebarProps) {
  const lastIndex = items.length - 1

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
                  'data-[selected=true]:text-accent size-11! w-11! min-w-0! px-0!',
                  index === lastIndex && 'mt-auto',
                )
          }
        >
          {item.icon}
          <Tabs.Indicator className={cn(!isMobile && 'bg-accent/15! rounded-3xl! shadow-none!')} />
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

  return <AutoHidingRail onHiddenChange={onHiddenChange}>{list}</AutoHidingRail>
}

/**
 * The kiosk rail. Absolutely positioned over the panes so it can precede them in the DOM
 * (React Aria); the parent pads the panes by `SIDEBAR_PAD_CLASS` while it is up, so they
 * stretch and push as it slides away to the left and back. A touch anywhere brings it
 * back; the pin button, under the last tab, turns auto-hide off.
 */
function AutoHidingRail({
  children,
  onHiddenChange,
}: {
  children: ReactNode
  onHiddenChange?: (hidden: boolean) => void
}) {
  const [autoHide, setAutoHide] = useState(true)
  const hidden = useAutoHide(autoHide)
  useEffect(() => onHiddenChange?.(hidden), [hidden, onHiddenChange])
  // Leaving the rail layout must give the panes their space back.
  useEffect(() => () => onHiddenChange?.(false), [onHiddenChange])

  return (
    <aside
      data-state={hidden ? 'hidden' : 'visible'}
      // `inert` while hidden keeps the off-screen tabs out of the tab order and AT.
      inert={hidden}
      className={cn(
        'border-border bg-surface absolute inset-y-0 left-0 z-40 flex w-[56px] flex-col gap-2 overflow-hidden border-r py-2 pl-0.5 transition-transform duration-300 motion-reduce:transition-none',
        hidden && '-translate-x-full',
      )}
    >
      {children}
      <button
        type="button"
        aria-label={autoHide ? 'Pin navigation bar' : 'Auto-hide navigation bar'}
        aria-pressed={autoHide}
        onClick={() => setAutoHide(!autoHide)}
        className="text-muted active:bg-default mx-auto grid size-11 shrink-0 place-items-center rounded-3xl"
      >
        {autoHide ? <PinOff className="size-5" /> : <Pin className="size-5" />}
      </button>
    </aside>
  )
}
