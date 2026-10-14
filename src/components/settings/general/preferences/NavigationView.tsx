import { ToggleButton, ToggleButtonGroup } from '@heroui/react'
import type { SettingsNavStyle } from '@/hooks/useSettingsNavStyle'

const CHOICES: { value: SettingsNavStyle; label: string }[] = [
  { value: 'subpage', label: 'Subpages' },
  { value: 'drawer', label: 'Drawers' },
]

interface NavigationViewProps {
  /** The stored choice (not the phone override). */
  style: SettingsNavStyle
  onChange: (style: SettingsNavStyle) => void
  /** On a phone Settings always uses subpages, so there is nothing to choose. */
  isMobile: boolean
}

/** Settings › General › Display & Appearance › Navigation style: subpages or right-side drawers. */
export function NavigationView({ style, onChange, isMobile }: NavigationViewProps) {
  return (
    <div className="border-border bg-surface flex flex-col gap-3 overflow-hidden rounded-2xl border px-3.5 py-3">
      {isMobile ? (
        <p className="text-muted text-sm">Settings always uses subpages on a phone.</p>
      ) : (
        <>
          <ToggleButtonGroup
            aria-label="Navigation style"
            selectionMode="single"
            disallowEmptySelection
            fullWidth
            selectedKeys={new Set([style])}
            onSelectionChange={(keys) => {
              const key = [...keys][0]
              // HeroUI re-fires the selection on a re-tap of the selected item.
              const next = CHOICES.find((choice) => choice.value === key)
              if (next !== undefined && next.value !== style) onChange(next.value)
            }}
          >
            {CHOICES.map((choice, index) => (
              <ToggleButton key={choice.value} id={choice.value}>
                {index > 0 && <ToggleButtonGroup.Separator />}
                {choice.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <p className="text-muted text-xs">
            Subpages replace the page with each view. Drawers slide each view in from the right.
          </p>
        </>
      )}
    </div>
  )
}
