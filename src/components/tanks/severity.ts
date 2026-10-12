import type { ChipProps } from '@heroui/react'
import type { TankSeverity } from '@/lib/tank-alarm'

/**
 * The one place a severity key becomes a colour. The badge, the Status text and
 * the gauge fill all read it, so they cannot disagree.
 */
export const CHIP_COLOR: Record<TankSeverity, NonNullable<ChipProps['color']>> = {
  danger: 'danger',
  warning: 'warning',
  success: 'success',
  accent: 'accent',
}

/** Solid gauge fill. `success` only ever marks a badge; a fill is never green. */
export const FILL_COLOR: Record<TankSeverity, string> = {
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  success: 'var(--accent)',
  accent: 'var(--accent)',
}

/** Text over the fill: white on accent/danger, dark on amber (white on amber is 2.05:1). */
export const FILL_TEXT_COLOR: Record<TankSeverity, string> = {
  danger: 'var(--danger-foreground)',
  warning: 'var(--warning-foreground)',
  success: 'var(--accent-foreground)',
  accent: 'var(--accent-foreground)',
}

/** Status text colour; the accent/success wording reads as plain text. */
export const TEXT_COLOR: Record<TankSeverity, string | undefined> = {
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  success: 'var(--success)',
  accent: undefined,
}
