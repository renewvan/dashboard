import { useState } from 'react'
import type { ReactNode } from 'react'
import { Settings } from 'lucide-react'
import { Button, Popover } from '@heroui/react'
import type { ButtonProps } from '@heroui/react'
import { MENU_ROW, MENU_ROW_ICON } from './menuRow'

export interface IconStatusButtonProps extends Omit<ButtonProps, 'children' | 'variant'> {
  /** Caller-built, already-colored icon node (lucide element or inline-SVG span). */
  icon: ReactNode
  /** Accessible name of the trigger (`aria-label`; RAC's `Button` has no
   * `title` passthrough, so there is no native hover tooltip). */
  label: string
  /** Popover heading — rendered as a real `Popover.Heading` so the dialog
   * is labelled for screen readers, not just visually bold. */
  title?: ReactNode
  /** Popover body between the title and the settings footer. */
  children?: ReactNode
  /** Footer CTA label. */
  settingsLabel?: string
  /** When given, adds a settings footer that closes the popover first. */
  onOpenSettings?: () => void
  /** A full-width row (the phone drawer): the icon with `rowLabel` beside it, left-aligned. */
  fullWidth?: boolean
  /** The row's visible text; the accessible name stays `label`. */
  rowLabel?: string
  /** The row's trailing detail, such as the signal strength. */
  rowHint?: string
}

/**
 * A header *status* button: reports a live condition, opens a detail
 * popover on tap (`CONTEXT.md`'s "Status button"). Visually transparent
 * (HeroUI's `ghost` button) — color lives in the caller's icon element,
 * not here.
 *
 * The HeroUI `Button` is placed directly inside the `Popover` root so
 * react-aria's dialog trigger wires the press handlers onto a real
 * native `<button>` (`Popover.Trigger` would render a `<div role=button>`).
 * The popover is controlled so the settings action can close it before
 * navigating. Theme tokens resolve from `<html data-theme>` even though
 * the popover portals to `document.body`.
 */
export function IconStatusButton({
  icon,
  label,
  title,
  children,
  settingsLabel = 'Open settings',
  onOpenSettings,
  fullWidth = false,
  rowLabel,
  rowHint,
  ...rest
}: IconStatusButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button
        isIconOnly={!fullWidth}
        fullWidth={fullWidth}
        variant="ghost"
        aria-label={label}
        className={fullWidth ? MENU_ROW : undefined}
        {...rest}
      >
        {fullWidth ? <span className={MENU_ROW_ICON}>{icon}</span> : icon}
        {fullWidth && (
          <span className="min-w-0 flex-1 truncate text-left">{rowLabel ?? label}</span>
        )}
        {fullWidth && rowHint && <span className="text-muted text-sm">{rowHint}</span>}
      </Button>
      <Popover.Content className="w-64">
        <Popover.Dialog className="flex max-h-[calc(100dvh-5rem)] flex-col gap-2 text-sm">
          {title && <Popover.Heading className="text-sm font-medium">{title}</Popover.Heading>}
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {onOpenSettings && (
            <Button
              variant="outline"
              fullWidth
              className="mt-2 min-h-12 shrink-0"
              onPress={() => {
                setOpen(false)
                onOpenSettings()
              }}
            >
              <Settings className="size-4" />
              {settingsLabel}
            </Button>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
