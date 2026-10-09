import { useState } from 'react'
import type { ReactNode } from 'react'
import { Settings } from 'lucide-react'
import { Button, Popover } from '@heroui/react'
import type { ButtonProps } from '@heroui/react'

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
  ...rest
}: IconStatusButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button isIconOnly variant="ghost" aria-label={label} {...rest}>
        {icon}
      </Button>
      <Popover.Content className="w-64">
        <Popover.Dialog className="flex flex-col gap-2 text-sm">
          {title && <Popover.Heading className="text-sm font-medium">{title}</Popover.Heading>}
          {children}
          {onOpenSettings && (
            <Button
              variant="outline"
              fullWidth
              className="mt-4"
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
