import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { useAutoHide } from '@/hooks/useAutoHide'
import type { NavbarPosition } from '@/hooks/useNavbarPosition'

/** Custom property the header publishes on `<html>` so the toast region (portaled to `<body>`, see `main.tsx`) can sit below it. */
const HEADER_HEIGHT_VAR = '--app-header-height'

// HeroUI's component CSS is unlayered, so utilities need `!` to override its spacing; the shell sizes panes itself.
// Every panel pads its navbar edge by the inset the `Tabs` root publishes (below), so no page, built
// or not, runs under the navbar while it is up, and all of them stretch into the space as it slides
// away.
const PANEL_CLASS =
  'm-0! flex min-h-0 min-w-0 flex-1 flex-col p-0! pb-(--navbar-inset-bottom)! pl-(--navbar-inset-left)!'

// The kiosk navbar floats over the panes and never pushes them. The `Tabs` root publishes how much
// of the pane's edge it currently covers as `--navbar-inset-bottom` / `--navbar-inset-left` (0
// while it is slid away or on the other side). The rail is 56px wide; the bar is one 56px touch
// target (an icon over its label; docs/design-principles.md asks for 44px) plus its 1px border,
// plus the safe-area inset.
const RAIL_INSET = '56px'
const BAR_INSET = 'calc(57px + env(safe-area-inset-bottom))'

/** Keeps `--app-header-height` on `<html>` equal to the header's height; returns the header's ref. */
export function useHeaderHeightVar() {
  const headerRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return
    const root = document.documentElement
    // While the Settings subpage's bar replaces the header, the header is `display: none` (its
    // height reads 0) and the bar publishes its own height instead: never overwrite it.
    const syncHeaderHeight = () => {
      if (header.offsetHeight > 0)
        root.style.setProperty(HEADER_HEIGHT_VAR, `${header.offsetHeight}px`)
    }
    syncHeaderHeight()
    const observer = new ResizeObserver(syncHeaderHeight)
    observer.observe(header)
    return () => {
      observer.disconnect()
      root.style.removeProperty(HEADER_HEIGHT_VAR)
    }
  }, [])
  return headerRef
}

/**
 * How the navbar sits against the panes: which edge it is on, whether it has slid away or is
 * pinned, the inset it covers (published to the `Tabs` root as CSS variables) and the padding
 * transition the page and header share.
 */
export function useShellLayout(isMobile: boolean, navbarPosition: NavbarPosition) {
  // Derived at render and never written: the stored kiosk choice survives a phone visit.
  const isBottomBar = !isMobile && navbarPosition === 'bottom'
  // The kiosk navbar's auto-hide lives here, not in the navbar: React Aria renders everything
  // inside `Tabs` a second time, hidden, to build its collection, so a hook in the navbar would
  // run twice and the hidden copy would keep hiding a pinned navbar (and shifting the page).
  // The pin resets on reload and the phone's bottom bar never hides.
  const [navPinned, setNavPinned] = useState(false)
  const navHidden = useAutoHide(!isMobile && !navPinned)
  // The inset the visible kiosk navbar covers; the phone's bottom bar stays in the layout.
  const navInset = isMobile || navHidden ? '0px' : isBottomBar ? BAR_INSET : RAIL_INSET
  // The page and header glide as the navbar slides away or back; a pinned navbar never moves, so
  // neither do they (pinning leaves them exactly where they are, un-pinning does not animate).
  const insetMotion = navPinned
    ? ''
    : 'transition-[padding] duration-300 motion-reduce:transition-none'
  const navbarInsetStyle = {
    '--navbar-inset-bottom': isBottomBar ? navInset : '0px',
    '--navbar-inset-left': isBottomBar ? '0px' : navInset,
  } as CSSProperties
  return {
    isBottomBar,
    navPinned,
    setNavPinned,
    navHidden,
    insetMotion,
    // The gap under a phone's header is each page's own scroller's top padding, so it scrolls away
    // with the content. It must not sit on the panel: padding on a non-scrolling parent stays put,
    // and scrolled content would clip 12px below the header's border, leaving a dead strip.
    panelClass: cn(PANEL_CLASS, insetMotion),
    navbarInsetStyle,
  }
}
