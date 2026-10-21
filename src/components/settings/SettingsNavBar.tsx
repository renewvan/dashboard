import type { ReactNode } from 'react'
import { Button } from '@heroui/react'
import { ChevronLeft } from 'lucide-react'

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
 */
export function SettingsNavBar({ title, parentTitle, onBack, action }: SettingsNavBarProps) {
  return (
    <nav aria-label="Settings navigation" className="grid grid-cols-[1fr_auto_1fr] items-center">
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
