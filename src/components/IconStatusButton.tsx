import type React from 'react'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './ui/popover'

export interface IconStatusButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  /** Caller-built, already-colored icon node (lucide element or inline-SVG span). */
  icon: React.ReactNode
  /** Accessible name + tooltip for the trigger. */
  label: string
  /** Rendered inside the popover; the component owns the popover wiring. */
  popoverContent: React.ReactNode
  /** When given, adds an "Open settings" footer that closes the popover first. */
  onOpenSettings?: () => void
}

/**
 * A header *status* button: reports a live condition, opens a detail
 * popover on tap (`CONTEXT.md`'s "Status button"). Visually the opposite
 * of the tinted *action* buttons (`ThemeToggleButton`/`DisplayPowerButton`):
 * fully transparent background — color lives in the caller's icon element,
 * not here — so feedback is the `active:` press flash plus a
 * `focus-visible` ring, never a hover reveal (`docs/design-principles.md`).
 *
 * The button itself is the popover trigger; callers never touch the
 * popover primitives.
 */
export function IconStatusButton({ icon, label, popoverContent, onOpenSettings, type = 'button', ...rest }: IconStatusButtonProps) {
  return (
    <Popover>
      <PopoverTrigger
        type={type}
        aria-label={label}
        title={label}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border active:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...rest}
      >
        {icon}
      </PopoverTrigger>
      <PopoverContent className="flex w-56 flex-col gap-2 p-3 text-sm">
        {popoverContent}
        {onOpenSettings && (
          // Full-width 44px row per docs/design-principles.md — this is a
          // real touch target on the same gloved-finger flow as the trigger.
          <PopoverClose
            className="-mx-3 -mb-3 mt-1 flex min-h-11 items-center justify-center rounded-b-[inherit] border-t border-border text-muted-foreground active:bg-foreground/10"
            onClick={onOpenSettings}
          >
            Open settings
          </PopoverClose>
        )}
      </PopoverContent>
    </Popover>
  )
}
