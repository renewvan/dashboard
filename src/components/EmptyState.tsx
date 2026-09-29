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
 * renders just the one div. Border removed entirely (`border-0`) —
 * the earlier bordered-square treatment still looked inconsistent
 * across themes, so the badge is now just the icon itself, sized up
 * (`size-8`) and colored `text-muted-foreground` to read as a single
 * flat gray glyph with no surrounding box.
 */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia className="mb-2 flex size-12 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground [&_svg]:size-8">
          {icon}
        </EmptyMedia>
        <EmptyTitle className="text-muted-foreground">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  )
}
