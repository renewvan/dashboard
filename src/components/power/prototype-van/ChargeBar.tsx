// PROTOTYPE: throwaway. The van's charge bar, in the style of the Tanks page's mobile level bar
// (tanks/TankRow): a rounded-lg track with a 2px border, tick lines at 25/50/75%, and a flat fill
// clipped by the track. The fill is accent, or danger at 20% and below, as the van's own fill is.

const GRIDLINES = [25, 50, 75]

export function ChargeBar({
  soc,
  className = '',
}: {
  soc: number | undefined
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, soc ?? 0))
  const low = soc !== undefined && soc <= 20
  return (
    <div
      className={`border-border! bg-surface-secondary relative h-6 overflow-hidden rounded-lg border-2 ${className}`}
    >
      {GRIDLINES.map((mark) => (
        <div
          key={mark}
          className="border-foreground/35! absolute inset-y-0 z-10 border-l"
          style={{ left: `${mark}%` }}
        />
      ))}
      <div
        className="absolute inset-y-0 left-0 transition-[width]"
        style={{ width: `${pct}%`, background: low ? 'var(--danger)' : 'var(--accent)' }}
      />
    </div>
  )
}
