import { useId, type ReactNode } from 'react'

/**
 * A titled set of rows: the heading names the region for screen readers. A `nested` group sits
 * inside another: its heading is a level lower and quieter, so the outer title still leads.
 */
export function Group({
  title,
  nested = false,
  children,
}: {
  title: string
  nested?: boolean
  children: ReactNode
}) {
  const headingId = useId()
  const Heading = nested ? 'h3' : 'h2'
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <Heading
        id={headingId}
        className={nested ? 'text-muted px-1 text-xs font-medium' : 'px-1 text-sm font-medium'}
      >
        {title}
      </Heading>
      {children}
    </section>
  )
}
