import type { ReactNode } from 'react'

interface StubPaneProps {
  /** Pane id (a nav item id, or `alerts`); used to label the heading. */
  id: string
  /** Literal title: the nav item label, or e.g. "Alerts" (no nav item). */
  title: string
  icon?: ReactNode
}

/**
 * Placeholder body for a pane whose page hasn't been ported to HeroUI yet.
 * HeroUI default tokens only.
 */
export function StubPane({ id, title, icon }: StubPaneProps) {
  const headingId = `stub-pane-${id}-title`
  return (
    <section
      aria-labelledby={headingId}
      data-testid={`pane-${id}`}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
    >
      {icon ? (
        <span aria-hidden="true" className="text-muted">
          {icon}
        </span>
      ) : null}
      <h2 id={headingId} className="text-foreground text-lg font-semibold">
        {title}
      </h2>
      <p className="text-muted text-sm">Not migrated yet.</p>
    </section>
  )
}
