import type { ReactNode } from 'react'
import { Button } from '@heroui/react'
import { cn } from '@/lib/utils'
import { MenuChevron } from './MenuChevron'
import { MENU_ROW, MENU_ROW_ACTIVE, MENU_ROW_ICON } from './menuStyles'

export interface DrawerRowProps {
  icon: ReactNode
  label: string
  /** Opens a page: shows the trailing arrow. A row that does something else (or nothing) has none. */
  navigates?: boolean
  /** The page it opens is the current one: the accent look and `aria-current="page"`. */
  active?: boolean
  /** Not built yet: dimmed, not pressable, and no arrow, so it does not promise a page. */
  disabled?: boolean
  onPress?: () => void
  'data-testid'?: string
}

/**
 * A full-width row of the phone drawer: icon, label and, for a row that opens a page, an arrow. The
 * one row every plain drawer entry uses, so they cannot drift apart. `AlertsButton` has its own
 * (it carries the unseen count).
 */
export function DrawerRow({
  icon,
  label,
  navigates = false,
  active = false,
  disabled = false,
  onPress,
  'data-testid': testId,
}: DrawerRowProps) {
  return (
    <Button
      fullWidth
      variant="ghost"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      isDisabled={disabled}
      data-testid={testId}
      className={cn(MENU_ROW, active && MENU_ROW_ACTIVE)}
      onPress={onPress}
    >
      <span className={MENU_ROW_ICON}>{icon}</span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {navigates && !disabled && <MenuChevron />}
    </Button>
  )
}
