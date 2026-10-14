import { ToggleButton, ToggleButtonGroup } from '@heroui/react'
import type { NavbarPosition } from '@/hooks/useNavbarPosition'

const CHOICES: { value: NavbarPosition; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'bottom', label: 'Bottom' },
]

interface NavbarViewProps {
  /** The stored choice (not the phone override). */
  position: NavbarPosition
  onChange: (position: NavbarPosition) => void
  /** On a phone the navbar is always at the bottom, so there is nothing to choose. */
  isMobile: boolean
}

/** Settings › General › Display & Appearance › Navigation position: a left rail or an auto-hiding bottom bar. */
export function NavbarView({ position, onChange, isMobile }: NavbarViewProps) {
  return (
    <div className="border-border bg-surface flex flex-col gap-3 overflow-hidden rounded-2xl border px-3.5 py-3">
      {isMobile ? (
        <p className="text-muted text-sm">The navbar is always at the bottom on a phone.</p>
      ) : (
        <>
          <ToggleButtonGroup
            aria-label="Navigation position"
            selectionMode="single"
            disallowEmptySelection
            fullWidth
            selectedKeys={new Set([position])}
            onSelectionChange={(keys) => {
              const key = [...keys][0]
              // HeroUI re-fires the selection on a re-tap of the selected item.
              const next = CHOICES.find((choice) => choice.value === key)
              if (next !== undefined && next.value !== position) onChange(next.value)
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
            Left keeps a closed icon rail beside the pages. Bottom puts the navigation under them
            and hides it after a few idle seconds; touch the screen to bring it back.
          </p>
        </>
      )}
    </div>
  )
}
