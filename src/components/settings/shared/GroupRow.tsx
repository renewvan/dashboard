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
  /** A status dot's background class, left of the label (Devices rows). Decorative: the text says it. */
  statusTone?: string
}

/**
 * A bordered, rounded row that opens a deeper Settings page: optional icon, label,
 * live description, chevron. It stands alone, so stack several with a gap.
 * HeroUI's component CSS is unlayered, so the button's height, justification,
 * wrapping and radius need `!` to give way.
 */
export function GroupRow({ label, description, onOpen, icon, statusTone }: GroupRowProps) {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">
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
        {statusTone !== undefined && (
          <span
            aria-hidden="true"
            data-testid="status-dot"
            className={`size-2.5 shrink-0 rounded-full ${statusTone}`}
          />
        )}
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-muted text-xs break-words">{description}</span>
        </span>
        <ChevronRight aria-hidden="true" className="text-muted size-4 shrink-0" />
      </Button>
    </div>
  )
}
