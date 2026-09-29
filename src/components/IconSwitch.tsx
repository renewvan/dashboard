import type { ReactNode } from 'react'
import { Switch } from '@/components/ui/switch'

export interface IconSwitchProps {
  id: string
  icon: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  ariaLabel: string
  disabled?: boolean
  testId?: string
}

/**
 * Compact icon-labeled toggle for the header — `SettingsTab`'s rows have
 * room for a text label next to each `Switch`; the header doesn't, so an
 * icon stands in for the label instead. Still a real `<label
 * htmlFor>`/`Switch` pair matched by `id` (the same native
 * `for`/hidden-input association `SettingsTab` uses, not a manual
 * `onClick`), so the whole control toggles on tap, not just the small
 * switch track — per docs/design-principles.md's whole-row/whole-control
 * hit-area rule. Explicit `htmlFor`/`id`, not implicit label-wrapping,
 * matching `SettingsTab`'s existing pattern — Base UI's `Switch` isn't
 * guaranteed to render as a plain labelable `<button>`/`<input>` that
 * implicit wrapping could rely on.
 *
 * `h-11` (44px) on the label satisfies the 44×44px minimum touch-target
 * rule on the height axis even though the visual switch track is much
 * smaller — the icon + switch + horizontal padding comfortably clears
 * 44px of width too, so the control doesn't need to look visually bulky
 * to still have a full touch target.
 */
export function IconSwitch({
  id,
  icon,
  checked,
  onCheckedChange,
  ariaLabel,
  disabled,
  testId,
}: IconSwitchProps) {
  return (
    <label
      htmlFor={id}
      className="flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-1.5 text-white has-disabled:cursor-not-allowed has-disabled:opacity-64"
    >
      <span aria-hidden className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
        {icon}
      </span>
      <Switch
        id={id}
        aria-label={ariaLabel}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        data-testid={testId}
      />
    </label>
  )
}
