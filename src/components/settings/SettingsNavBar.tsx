import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Button } from '@heroui/react'
import { ChevronLeft } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

/** The custom property the app header publishes on `<html>`, so the toast region can sit below it. */
const HEADER_HEIGHT_VAR = '--app-header-height'

interface SettingsNavBarProps {
  /** The open view's title. */
  title: string
  /** The parent view's title; names the back button, like a mobile navigation bar. */
  parentTitle: string
  onBack: () => void
  /** Pinned to the bar's far right, where the app header's last control sits (the sleep button). */
  action?: ReactNode
}

/**
 * The bar a Settings subpage shows in place of the app header (logo, clock, status buttons): a
 * back button named for the parent view, the open view's title centred, and an optional action at
 * the far right. It carries no trail, so each tap goes up exactly one level (Back, or the
 * browser's own). The bar is the view's `h1`; the top list has its own.
 *
 * It takes the header's place, so it has the header's box: the same 8px/16px padding and, on a
 * phone, the same full-width surface and bottom border. While it is mounted it also publishes
 * its height as the header does, since the toast region sits below whichever bar is on top.
 */
export function SettingsNavBar({ title, parentTitle, onBack, action }: SettingsNavBarProps) {
  const isMobile = useIsMobile()
  const ref = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const bar = ref.current
    if (!bar) return
    const root = document.documentElement
    const syncHeight = () => root.style.setProperty(HEADER_HEIGHT_VAR, `${bar.offsetHeight}px`)
    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty(HEADER_HEIGHT_VAR)
    }
  }, [])

  return (
    <nav
      ref={ref}
      aria-label="Settings navigation"
      className={cn(
        // Full-bleed: cancels the Settings section's own 16px side padding.
        '-mx-4 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 py-2',
        isMobile && 'bg-surface border-border border-b',
      )}
    >
      <Button
        variant="ghost"
        className="min-h-11 max-w-full gap-0.5 justify-self-start pr-3 pl-1"
        onPress={onBack}
      >
        <ChevronLeft aria-hidden="true" className="size-6 shrink-0" />
        <span className="truncate text-base">{parentTitle}</span>
      </Button>
      <h1 className="truncate px-2 text-lg font-semibold">{title}</h1>
      {action !== undefined && <div className="justify-self-end">{action}</div>}
    </nav>
  )
}
