import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@heroui/react'

interface GroupRowProps {
  label: string
  /** Live one-line summary under the label. */
  description: string
  onOpen: () => void
  /** Leading icon (top-level rows). Decorative: the label already names the row. */
  icon?: ReactNode
  /**
   * `card` (default) is a bordered, rounded row that stands alone in a spaced stack.
   * `inline` is a square row for use inside a shared panel with other controls.
   */
  variant?: 'card' | 'inline'
}

const CARD = 'border-border bg-surface overflow-hidden rounded-2xl border'

/**
 * A row that opens a deeper Settings page: optional icon, label, live description, chevron.
 * HeroUI's component CSS is unlayered, so the button's height, justification,
 * wrapping and radius need `!` to give way.
 */
export function GroupRow({ label, description, onOpen, icon, variant = 'card' }: GroupRowProps) {
  const button = (
    <Button
      variant="ghost"
      fullWidth
      onPress={onOpen}
      className="h-auto! justify-between! gap-3! rounded-none! px-3.5! py-3! whitespace-normal! md:h-auto!"
    >
      {icon !== undefined && (
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center [&>svg]:size-6!"
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted text-xs break-words">{description}</span>
      </span>
      <ChevronRight aria-hidden="true" className="text-muted size-4 shrink-0" />
    </Button>
  )

  return variant === 'card' ? <div className={CARD}>{button}</div> : button
}
