import { useId, type ReactNode } from 'react'

/** A titled set of rows: the heading names the region for screen readers. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="px-1 text-sm font-medium">
        {title}
      </h2>
      {children}
    </section>
  )
}
