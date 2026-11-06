import type { ReactNode } from 'react'
import { ChevronRight, GripVertical } from 'lucide-react'
import { Button } from '@heroui/react'
import type { useDragReorder } from '@/hooks/useDragReorder'
import { cn } from '@/lib/utils'

export interface ReorderGrip {
  props: ReturnType<ReturnType<typeof useDragReorder>['handleProps']>
  onKeyDown: (key: 'ArrowUp' | 'ArrowDown') => void
  dragging: boolean
}

interface ReorderRowProps {
  /** The leading glyph, sized by the caller (a 24px icon); a row without one is text only. Decorative: the label names the row. */
  icon?: ReactNode
  label: string
  /** The line under the label: its position, and what else is worth a glance. */
  description: string
  /** Opens the row's own page, with a chevron. Without it the row is a label only. */
  onOpen?: () => void
  /** Present on a row that can be reordered: the grip that drags it. */
  grip?: ReorderGrip
}

/**
 * One row of a list the owner arranges: a grip to drag it (or the arrow keys on the grip), then its
 * icon, label and a line under it, and a chevron when it opens a page of its own. Every control is
 * 44px. The Start page's widgets and the Relays page's groups and relays are all arranged with it.
 */
export function ReorderRow({ icon, label, description, onOpen, grip }: ReorderRowProps) {
  const content = (
    <>
      {icon !== undefined && (
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
        <span className="max-w-full truncate text-sm font-medium">{label}</span>
        <span className="text-muted max-w-full truncate text-xs">{description}</span>
      </span>
    </>
  )
  return (
    <div
      className={cn(
        'border-border bg-surface flex items-center overflow-hidden rounded-2xl border select-none',
        grip?.dragging && 'shadow-lg',
      )}
    >
      {grip ? (
        <button
          type="button"
          aria-label={`Reorder ${label}`}
          {...grip.props}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              grip.onKeyDown(e.key)
            }
          }}
          className="text-muted flex size-11 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" className="size-5" />
        </button>
      ) : (
        <span aria-hidden="true" className="size-11 shrink-0" />
      )}
      {onOpen ? (
        <Button
          variant="ghost"
          fullWidth
          onPress={onOpen}
          className="h-auto! min-h-11 min-w-0 flex-1 justify-between! gap-3! rounded-none! py-3! pr-3.5! pl-1! whitespace-normal! md:h-auto!"
        >
          {content}
          <ChevronRight aria-hidden="true" className="text-muted size-4 shrink-0" />
        </Button>
      ) : (
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-3 pr-3.5 pl-1">
          {content}
        </div>
      )}
    </div>
  )
}
