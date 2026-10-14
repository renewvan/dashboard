import { useEffect, useState } from 'react'
import { Pin, PinOff } from 'lucide-react'
import { Tabs } from '@heroui/react'
import { cn } from '@/lib/utils'
import { useAutoHide } from '@/hooks/useAutoHide'
import type { NavItem } from '@/components/Sidebar'

/**
 * Bar = one 44px touch target (docs/design-principles.md) + its 1px top border. The parent
 * pads the panes by this much while the bar is up; the safe-area inset is added on top.
 */
export const BOTTOM_NAV_PAD_CLASS = 'pb-[calc(45px+env(safe-area-inset-bottom))]'

export interface BottomNavBarProps {
  items: NavItem[]
  /** Called with `true` while the bar is slid away, so the parent can give its space back. */
  onHiddenChange: (hidden: boolean) => void
}

/**
 * Kiosk primary navigation as a bottom bar: ONE HeroUI `Tabs.List` (the caller owns the
 * `Tabs` root and the panels). It slides away after `IDLE_MS` of inactivity and a touch
 * anywhere on the screen brings it back; the pin button turns auto-hide off. Absolutely
 * positioned inside the `Tabs` root so it can precede the panels in the DOM (React Aria
 * warns otherwise); the parent pads the panes by `BOTTOM_NAV_PAD_CLASS` so they stretch
 * and push as the bar hides and shows.
 */
export function BottomNavBar({ items, onHiddenChange }: BottomNavBarProps) {
  const [autoHide, setAutoHide] = useState(true)
  const hidden = useAutoHide(autoHide)
  useEffect(() => onHiddenChange(hidden), [hidden, onHiddenChange])
  // Leaving the bottom layout must give the panes their space back.
  useEffect(() => () => onHiddenChange(false), [onHiddenChange])

  return (
    <nav
      aria-label="Primary"
      data-state={hidden ? 'hidden' : 'visible'}
      // `inert` while hidden keeps the off-screen tabs out of the tab order and AT.
      inert={hidden}
      className={cn(
        'border-border bg-surface absolute inset-x-0 bottom-0 z-40 flex items-stretch border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(0_0_0/0.18)] transition-transform duration-300 motion-reduce:transition-none',
        hidden && 'translate-y-full',
      )}
    >
      {/* HeroUI's list is `min-width: 100%`, which would push the pin button off the bar. */}
      <Tabs.List aria-label="Navigation" className="min-w-0! flex-1 bg-transparent! p-0!">
        {items.map((item) => (
          <Tabs.Tab
            key={item.id}
            id={item.id}
            aria-label={item.label}
            data-testid={`nav-${item.id}`}
            className="data-[selected=true]:text-accent h-11! min-w-0 flex-1 flex-row! gap-2 px-0"
          >
            {item.icon}
            <span className="truncate text-xs font-medium">{item.label}</span>
            <Tabs.Indicator className="bg-accent/15! rounded-xl! shadow-none!" />
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <button
        type="button"
        aria-label={autoHide ? 'Pin navigation bar' : 'Auto-hide navigation bar'}
        aria-pressed={autoHide}
        onClick={() => setAutoHide(!autoHide)}
        className="border-border text-muted active:bg-default grid size-11 shrink-0 place-items-center border-l"
      >
        {autoHide ? <PinOff className="size-5" /> : <Pin className="size-5" />}
      </button>
    </nav>
  )
}
