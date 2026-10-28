const PILL =
  'bg-warning text-warning-foreground rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide uppercase'

/**
 * The "Demo" pill the app header and the Settings subpage bar show while the van data is simulated.
 * Given `onPress` (the app header and the Settings subpage bar) it is a button that turns Demo mode off: the pill stays small, the
 * hit area is 44px for gloved use (docs/design-principles.md). Without it, it is a readout.
 */
export function DemoBadge({ onPress }: { onPress?: () => void }) {
  if (onPress === undefined) return <span className={PILL}>Demo</span>
  return (
    <button
      type="button"
      aria-label="Turn Demo mode off"
      onClick={onPress}
      className="focus-visible:ring-accent flex min-h-11 min-w-11 items-center justify-center rounded-full outline-none focus-visible:ring-4 active:brightness-90"
    >
      <span aria-hidden="true" className={PILL}>
        Demo
      </span>
    </button>
  )
}
