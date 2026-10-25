import { useId, type ReactNode } from 'react'

/**
 * A titled set of drawer rows. The caption is a quiet uppercase label so the rows stay the
 * content; it names the group for screen readers (`aria-labelledby`).
 */
export function DrawerGroup({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1">
      <h2
        id={headingId}
        className="text-muted px-2 pt-1 pb-0.5 text-xs font-medium tracking-widest uppercase"
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
