import { ChevronRight } from 'lucide-react'
import { Button } from '@heroui/react'

/** One short figure on a row: the number and its unit, shown apart so the unit can sit quieter. */
export interface Figure {
  value: string
  unit?: string
}

/**
 * The row every published entity is listed as, whatever its type: its title on the left, a short
 * summary of what it reads on the right (figures split by a rule, units quieter than values), and
 * a chevron that opens the page with everything specific to it. One shape for batteries, solar,
 * chargers, GPS, temperature, relays and tanks, so a driver's entities all read and open the same
 * way. The whole row is the hit area. A figure the entity has not published is left out, never
 * guessed.
 */
export function EntityCard({
  label,
  subtitle,
  summary,
  onOpen,
}: {
  label: string
  subtitle?: string
  summary: Figure[]
  onOpen: () => void
}) {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">
      <Button
        variant="ghost"
        fullWidth
        onPress={onOpen}
        className="h-auto! min-h-16 justify-between! gap-4! rounded-none! px-4! py-3! whitespace-normal!"
      >
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
          <span className="text-foreground text-base font-medium">{label}</span>
          {subtitle !== undefined && <span className="text-muted text-xs">{subtitle}</span>}
        </span>
        {summary.length > 0 && (
          <span className="flex shrink-0 items-center">
            {summary.map(({ value, unit }, index) => (
              <span
                key={index}
                className={`text-muted text-base font-normal tabular-nums ${index > 0 ? 'border-border ml-3 border-l pl-3' : ''}`}
              >
                {value}
                {unit !== undefined && unit !== '' && (
                  <span className="text-muted/60 ml-0.5">{unit}</span>
                )}
              </span>
            ))}
          </span>
        )}
        <ChevronRight aria-hidden="true" className="text-muted size-5 shrink-0" />
      </Button>
    </div>
  )
}
