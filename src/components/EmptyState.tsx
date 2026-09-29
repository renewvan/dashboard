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
 * https://coss.com/ui/docs/components/empty.
 *
 * Uses `EmptyMedia`'s `default` variant, not `icon` — the `icon`
 * variant renders two extra decorative rotated layers behind the main
 * square for a "stack of sticker cards" look; once the fill is made
 * transparent (per an earlier explicit request) those layers still
 * keep their own borders, so all three become visible as three
 * overlapping bordered squares instead of one clean badge. `default`
 * renders just the one div, styled here as a single bordered square
 * with a transparent fill. Icon rendered at `size-7` (28px, bigger than
 * lucide's 24px default) per explicit request.
 */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia className="flex size-12 items-center justify-center rounded-md border border-border border-white bg-transparent [&_svg]:size-6">
          {icon}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  )
}
