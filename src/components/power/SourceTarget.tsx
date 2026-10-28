import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The face of a node: a plain box, or with `onPress` a button that fills it. The press is shown
 * (no hover on a touchscreen) and the focus ring is visible for a keyboard.
 */
export function SourceTarget({
  onPress,
  label,
  className,
  style,
  children,
}: {
  onPress: (() => void) | undefined
  /** The button's name, for a face that does not carry its own label (an orb's is drawn outside it). */
  label?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  if (onPress === undefined) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      className={cn(
        className,
        'focus-visible:ring-accent cursor-pointer transition-colors outline-none focus-visible:ring-4 active:bg-foreground/10',
      )}
      style={style}
    >
      {children}
    </button>
  )
}
