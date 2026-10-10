import { ChevronRight } from 'lucide-react'
import { Button } from '@heroui/react'

interface GroupRowProps {
  label: string
  /** Live one-line summary under the label. */
  description: string
  onOpen: () => void
}

/**
 * A row that opens a deeper Settings page: label, live description, chevron.
 * HeroUI's component CSS is unlayered, so the button's height, justification,
 * wrapping and radius need `!` to give way.
 */
export function GroupRow({ label, description, onOpen }: GroupRowProps) {
  return (
    <Button
      variant="ghost"
      fullWidth
      onPress={onOpen}
      className="h-auto! justify-between! rounded-none! px-3.5! py-3! whitespace-normal! md:h-auto!"
    >
      <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted text-xs break-words">{description}</span>
      </span>
      <ChevronRight aria-hidden="true" className="text-muted size-4 shrink-0" />
    </Button>
  )
}
