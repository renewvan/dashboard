import { Moon, Sun } from 'lucide-react'
import { Button } from '@heroui/react'
import type { Theme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { MENU_ROW, MENU_ROW_ICON, MENU_TILE } from './menuStyles'

export interface ThemeToggleButtonProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
  /** A full-width row (the phone drawer): the icon with the action named beside it. */
  fullWidth?: boolean
  /** An icon-only tile in the phone drawer's bottom row of three. */
  tile?: boolean
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
export function ThemeToggleButton({
  theme,
  onThemeChange,
  fullWidth = false,
  tile = false,
}: ThemeToggleButtonProps) {
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <Button
      isIconOnly={!fullWidth}
      fullWidth={fullWidth}
      variant="ghost"
      aria-label={`Switch to ${nextTheme} theme`}
      data-testid="dark-theme-toggle"
      className={cn(fullWidth && MENU_ROW, tile && MENU_TILE)}
      onPress={() => onThemeChange(nextTheme)}
    >
      {fullWidth ? (
        <span className={MENU_ROW_ICON}>
          <Icon className="size-5" />
        </span>
      ) : (
        <Icon className="size-5" />
      )}
      {fullWidth && (
        <span className="min-w-0 flex-1 truncate text-left">
          {nextTheme === 'dark' ? 'Dark theme' : 'Light theme'}
        </span>
      )}
    </Button>
  )
}
