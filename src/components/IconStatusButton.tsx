import type React from 'react'
import { Settings } from 'lucide-react'
import { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger } from './ui/popover'

export interface IconStatusButtonProps extends Omit<
  React.ComponentPropsWithoutRef<'button'>,
  'title'
> {
  /** Caller-built, already-colored icon node (lucide element or inline-SVG span). */
  icon: React.ReactNode
  /** Accessible name + tooltip for the trigger. */
  label: string
  /** Popover heading — rendered as a real `PopoverTitle` so the popup is
   * labelled for screen readers, not just visually bold. */
  title?: React.ReactNode
  /** Popover body between the title and the settings footer. */
  children?: React.ReactNode
  /** Footer CTA label. */
  settingsLabel?: string
  /** When given, adds a settings footer that closes the popover first. */
  onOpenSettings?: () => void
  /** Node the popover portals into — App's themed-root container, so the
   * popup resolves the active theme's tokens. Omitted → `document.body`,
   * which sits outside the `.dark` subtree and renders the light tokens
   * regardless of theme (same reason App portals sheets, see App.tsx). */
  portalContainer?: HTMLDivElement | null
}

/**
 * A header *status* button: reports a live condition, opens a detail
 * popover on tap (`CONTEXT.md`'s "Status button"). Visually the opposite
 * of the tinted *action* buttons (`ThemeToggleButton`/`DisplaySleepButton`):
 * fully transparent background — color lives in the caller's icon element,
 * not here — so feedback is the `active:` press flash plus a
 * `focus-visible` ring, never a hover reveal (`docs/design-principles.md`).
 *
 * The button itself is the popover trigger; callers never touch the
 * popover primitives. The popup is the coss.com/ui popover composition
 * (`PopoverTitle` + `PopoverClose`) styled like the Sheet drawer's glass
 * surface (`border-white/10 bg-card/40 backdrop-blur-md`) — the same
 * translucent card look in dark and light, which requires portaling into
 * the themed root (`portalContainer`) so `--card` etc. resolve per theme.
 */
export function IconStatusButton({
  icon,
  label,
  title,
  children,
  settingsLabel = 'Open settings',
  onOpenSettings,
  portalContainer,
  type = 'button',
  ...rest
}: IconStatusButtonProps) {
  return (
    <Popover>
      <PopoverTrigger
        type={type}
        aria-label={label}
        title={label}
        className="active:bg-foreground/10 focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-full border focus-visible:ring-2 focus-visible:outline-none"
        {...rest}
      >
        {icon}
      </PopoverTrigger>
      <PopoverContent
        portalProps={{ container: portalContainer ?? undefined }}
        className="bg-card/40 text-foreground flex w-64 flex-col gap-2 border-white/10 text-sm backdrop-blur-md"
      >
        {title && <PopoverTitle className="text-sm font-medium">{title}</PopoverTitle>}
        {children}
        {onOpenSettings && (
          // Full-width 44px row per docs/design-principles.md — this is a
          // real touch target on the same gloved-finger flow as the
          // trigger. An inset bordered button (not an edge-bleed footer):
          // the popup's own viewport padding is fixed inside ui/popover,
          // so a bleed can never meet the rounded corner cleanly.
          <PopoverClose
            onClick={onOpenSettings}
            className="hover:bg-foreground/5 active:bg-foreground/10 text-muted-foreground mt-4 flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-white/10 text-sm font-medium"
          >
            <Settings className="size-4" />
            {settingsLabel}
          </PopoverClose>
        )}
      </PopoverContent>
    </Popover>
  )
}
