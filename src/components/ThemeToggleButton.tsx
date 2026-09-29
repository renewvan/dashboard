import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'

export interface ThemeToggleButtonProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

/**
 * Header theme toggle — a plain icon button, not a `Switch`/`IconSwitch`
 * (replaced per explicit request), matching `DisplayPowerButton`'s
 * style exactly (`bg-foreground/10` resting, `hover:bg-foreground/16`,
 * `rounded-full`, real 44×44px touch target).
 *
 * Shows the icon for the *other* theme — the one tapping switches
 * to — not the current one: `Sun` while dark (tap for light), `Moon`
 * while light (tap for dark). Same "icon signals the action, not the
 * current state" convention as `DisplayPowerButton` (`Power`/`PowerOff`
 * reflect what tapping does, not just display the current on/off).
 */
export function ThemeToggleButton({ theme, onThemeChange }: ThemeToggleButtonProps) {
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      data-testid="dark-theme-toggle"
      onClick={() => onThemeChange(nextTheme)}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-white hover:bg-foreground/16"
    >
      <Icon className="size-5" />
    </button>
  )
}
