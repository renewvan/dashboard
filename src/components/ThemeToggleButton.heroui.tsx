import { Moon, Sun } from 'lucide-react'
import { Button } from '@heroui/react'
import type { Theme } from '@/hooks/useTheme'

export interface ThemeToggleButtonProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

/**
 * Header theme toggle — a plain HeroUI icon button, not a `Switch`
 * (replaced per explicit request), styled like `DisplaySleepButton`.
 *
 * Shows the icon for the *other* theme — the one tapping switches
 * to — not the current one: `Sun` while dark (tap for light), `Moon`
 * while light (tap for dark). Same "icon signals the action, not the
 * current state" convention as `DisplaySleepButton` (`SleepIcon`/`SleepOffIcon`
 * reflect what tapping does, not just display the current on/off).
 */
export function ThemeToggleButton({ theme, onThemeChange }: ThemeToggleButtonProps) {
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <Button
      isIconOnly
      variant="tertiary"
      aria-label={`Switch to ${nextTheme} theme`}
      data-testid="dark-theme-toggle"
      onPress={() => onThemeChange(nextTheme)}
    >
      <Icon className="size-5" />
    </Button>
  )
}
