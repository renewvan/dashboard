import type { ReactNode } from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

export interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
}

/**
 * Default "no data yet" state for a tab's content, built on Coss's
 * `Empty` primitive (`src/components/ui/empty.tsx`) instead of each tab
 * hand-rolling its own centered `<p>`, per
 * https://coss.com/ui/docs/components/empty. `EmptyMedia`'s `icon`
 * variant gives the icon its own bordered card-style badge (with the
 * signature stacked/rotated shadow layers behind it) rather than a bare
 * floating icon — matches the reference design's empty-state treatment.
 */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  )
}
