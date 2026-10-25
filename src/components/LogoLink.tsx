import { cn } from '@/lib/utils'

/**
 * The renewvan lockup as a link to the Start page. A real link, so long-press and middle-click
 * behave, but a plain tap is a one-entry SPA transition (`onNavigate`), the same as the Start nav
 * tab. 44px tall: the touch-target minimum. Shared by the app header and the phone drawer.
 */
export function LogoLink({
  src,
  onNavigate,
  className,
}: {
  /** The lockup for the current theme. */
  src: string
  /** A plain tap: go to Start (the caller also closes whatever the logo sits in). */
  onNavigate: () => void
  className?: string
}) {
  return (
    <a
      href="?page=start"
      aria-label="renewvan"
      className={cn('flex h-11 items-center', className)}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0) return
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onNavigate()
      }}
    >
      <img src={src} alt="" className="h-10 w-auto" />
    </a>
  )
}
