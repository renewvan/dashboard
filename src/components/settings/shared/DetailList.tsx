import type { ReactNode } from 'react'

/** Read-only label/value rows in one bordered panel. A row is never hidden: a
 * missing value renders `—`. */
export function DetailList({ children, label }: { children: ReactNode; label: string }) {
  return (
    <dl
      aria-label={label}
      className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border"
    >
      {children}
    </dl>
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
        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${tone}`} />
        {text}
      </dd>
    </div>
  )
}
