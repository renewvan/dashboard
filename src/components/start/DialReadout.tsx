import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { DialView } from './cockpit/dialView'

export type DialSize = 'side' | 'focus'

const READOUT: Record<
  DialSize,
  {
    icon: string
    label: string
    value: string
    unit: string
    sub: string
    togo: string
  }
> = {
  side: {
    icon: 'mt-6',
    label: 'text-[10px] tracking-[0.2em]',
    value: 'text-5xl',
    unit: 'text-base',
    sub: 'text-sm pt-3.5',
    togo: 'mt-1 text-xs',
  },
  // Sized in `--u` (1px at the rings' full 420px, shrinking with them; set by the Dial), so the
  // readout keeps fitting inside the rings on a short screen where they are scaled down.
  focus: {
    icon: 'scale-120',
    label: 'text-[length:calc(12*var(--u,1px))] tracking-[0.2em]',
    value: 'mt-[calc(6*var(--u,1px))] text-[length:calc(60*var(--u,1px))] leading-none',
    unit: 'text-[length:calc(20*var(--u,1px))]',
    sub: 'mt-[calc(12*var(--u,1px))] text-[length:calc(16*var(--u,1px))]',
    togo: 'mt-[calc(10*var(--u,1px))] text-[length:calc(14*var(--u,1px))]',
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
  hideState,
}: {
  view: DialView
  icon: ReactNode
  size: DialSize
  /** Leaves out the time-to-go / state line, for a caller that shows it elsewhere (`DialState`). */
  hideState?: boolean
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
      {!hideState && <DialState view={view} className={cn('tabular-nums', text.togo)} />}
    </>
  )
}

/**
 * The line saying what the battery is doing: the runtime left while it discharges, else its state.
 * Nothing while the dial is faulted or has neither.
 */
export function DialState({
  view,
  className,
  icon,
}: {
  view: DialView
  className?: string
  /** Drawn before the text, sized to it. */
  icon?: ReactNode
}) {
  if (view.faulted || !(view.timeToGo || view.state)) return null
  return (
    <div
      data-testid="dial-state"
      className={cn('text-muted', icon && 'flex items-center gap-[0.5em]', className)}
    >
      {icon && <span className="[&>svg]:size-[1.2em]!">{icon}</span>}
      {view.timeToGo ? (
        <span data-testid="dial-time-to-go">
          <span className="text-foreground font-semibold">{view.timeToGo}</span> to go
        </span>
      ) : (
        view.state
      )}
    </div>
  )
}
