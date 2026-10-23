import type { ReactNode } from 'react'

/**
 * Read-only label/value rows in one bordered panel. A row is never hidden: a missing value renders
 * `—`. `label` is the list's accessible name. `heading` also shows a title above the panel, for a
 * page of several lists where a sighted reader needs to tell them apart (the style of the Driver
 * page's "Publishes"): `true` shows the label itself, a string shows that instead, for when the
 * accessible name is longer than the title or would only repeat the page's.
 */
export function DetailList({
  children,
  label,
  heading = false,
}: {
  children: ReactNode
  label: string
  heading?: boolean | string
}) {
  const list = (
    <dl
      aria-label={label}
      className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border"
    >
      {children}
    </dl>
  )
  if (heading === false) return list
  return (
    <section className="flex flex-col gap-2">
      <h2
        aria-hidden="true"
        className="text-muted px-1 text-xs font-medium tracking-wide uppercase"
      >
        {heading === true ? label : heading}
      </h2>
      {list}
    </section>
  )
}

export function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <dt className="text-sm">{label}</dt>
      <dd className="text-muted text-xs tabular-nums">{value ?? '—'}</dd>
    </div>
  )
}

/** A row whose value is a status: a colour dot (decorative) plus its text. */
export function StatusRow({ label, tone, text }: { label: string; tone: string; text: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <dt className="text-sm">{label}</dt>
      <dd className="text-muted flex items-center gap-2 text-xs">
        <span
          aria-hidden="true"
          data-testid="status-dot"
          className={`size-2 shrink-0 rounded-full ${tone}`}
        />
        {text}
      </dd>
    </div>
  )
}
