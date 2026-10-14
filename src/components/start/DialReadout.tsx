import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { DialView } from './cockpit/dialView'

export type DialSize = 'side' | 'focus'

const READOUT: Record<
  DialSize,
  { icon: string; label: string; value: string; unit: string; sub: string }
> = {
  side: {
    icon: 'mt-6',
    label: 'text-[10px] tracking-[0.2em]',
    value: 'text-5xl',
    unit: 'text-base',
    sub: 'text-sm pt-3.5',
  },
  focus: {
    icon: 'scale-120',
    label: 'text-xs tracking-[0.2em]',
    value: 'mt-2 text-6xl',
    unit: 'text-xl',
    sub: 'mt-3 text-base',
  },
}

/** The subline; with `unitsStrong`, `V`/`W`/`ℓ` units after a number take the foreground colour. */
function DialSub({ sub, unitsStrong }: { sub: string; unitsStrong?: boolean }) {
  if (!unitsStrong) return <>{sub}</>
  return (
    <>
      {sub.split(/(?<=\d\s?)([VW\u2113])/).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-foreground">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

/**
 * The text at the middle of a cockpit dial: icon, label, the italic percentage (or "Fault") and the
 * subline. One component for the Start page's dials and for the readout inside the rings, so the
 * two cannot drift apart. The caller positions it and hides it from assistive tech.
 */
export function DialReadout({
  view,
  icon,
  size,
}: {
  view: DialView
  icon: ReactNode
  size: DialSize
}) {
  const text = READOUT[size]
  return (
    <>
      <span className={cn('text-muted', text.icon)}>{icon}</span>
      <div className={cn('text-muted uppercase', text.label)}>{view.label}</div>
      {view.faulted ? (
        <div className="text-danger py-3 text-xl font-semibold">Fault</div>
      ) : (
        <div className={cn('flex items-baseline font-light italic tabular-nums', text.value)}>
          {Math.round(view.pct)}
          <span className={cn('text-accent font-semibold', text.unit)}>%</span>
        </div>
      )}
      <div
        className={cn(
          'text-muted tracking-widest uppercase',
          text.sub,
          view.faulted ? 'text-xs' : 'text:base',
        )}
      >
        <DialSub sub={view.sub} unitsStrong={view.unitsStrong} />
      </div>
    </>
  )
}
