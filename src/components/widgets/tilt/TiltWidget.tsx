import { Card } from '@heroui/react'
import { formatDeg, isLevel, rearViewRotation, sideViewRotation, tiltReading } from '@/lib/tilt'
import type { Tilt } from '@/types'
import { VanRear, VanSide } from './index.tsx'

export interface TiltWidgetProps {
  /** Latest tilt record; undefined until the node publishes anything. */
  tilt: Partial<Tilt> | undefined
  /**
   * Short slots (the kiosk's cockpit row at 468px tall leaves ~70px): each van gets its own
   * narrow column with a smaller, capped drawing and the angle directly below it, so the vans
   * keep a visible height instead of being squeezed by the readout row.
   */
  compact?: boolean
}

function tone(deg: number | null): string {
  if (deg === null) return 'text-muted'
  return isLevel(deg) ? 'text-emerald-400' : 'text-amber-400'
}

const VAN = 'h-full origin-bottom transition-transform duration-500'
/** The compact card sizes each van itself: `VAN`'s `h-full` would resolve against a content-sized parent. */
const VAN_COMPACT = 'h-9 w-auto origin-bottom transition-transform duration-500'

/**
 * Start-page card showing the van's inclination: a side van (pitch) and a rear
 * van (roll) that physically tilt over a ground line, with the angles below.
 * Each angle is tinted green inside the level tolerance and amber outside.
 */
export function TiltWidget({ tilt, compact = false }: TiltWidgetProps) {
  const { roll, pitch } = tiltReading(tilt)
  if (compact) {
    return (
      <Card data-testid="tilt-card" variant="transparent" className="gap-0! overflow-visible p-0!">
        <Card.Content className="px-1 py-0">
          <div className="grid grid-cols-2 items-start gap-12">
            {(
              [
                { id: 'tilt-pitch', label: 'Pitch', deg: pitch, Van: VanSide },
                { id: 'tilt-roll', label: 'Roll', deg: roll, Van: VanRear },
              ] as const
            ).map(({ id, label, deg, Van }) => (
              <div key={id} className="flex flex-col items-center gap-0.5">
                <Van
                  className={`${VAN_COMPACT} ${tone(deg)}`}
                  style={{
                    transform: `rotate(${(id === 'tilt-pitch' ? sideViewRotation : rearViewRotation)(deg)}deg)`,
                  }}
                />
                <div className="bg-foreground/25 my-1.5 h-0.5 w-full shrink-0 rounded" />
                <span
                  data-testid={id}
                  className={`text-lg leading-none font-bold tabular-nums ${tone(deg)}`}
                >
                  {formatDeg(deg)}
                </span>
                <span className="text-muted text-[10px] leading-none">{label}</span>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    )
  }
  return (
    <Card
      data-testid="tilt-card"
      variant="transparent"
      className="h-full min-h-0 gap-0! overflow-hidden p-0!"
    >
      <Card.Content className="h-full min-h-0 justify-between px-3 py-2">
        <div className="grid min-h-0 flex-1 grid-cols-[1.45fr_1fr] items-end justify-items-center gap-3">
          <VanSide
            className={`${VAN} ${tone(pitch)}`}
            style={{ transform: `rotate(${sideViewRotation(pitch)}deg)` }}
          />
          <VanRear
            className={`${VAN} ${tone(roll)}`}
            style={{ transform: `rotate(${rearViewRotation(roll)}deg)` }}
          />
        </div>
        <div className="bg-foreground/25 my-1.5 h-0.5 w-full shrink-0 rounded" />
        <div className="grid shrink-0 grid-cols-[1.45fr_1fr] gap-3 text-center">
          <div className="flex flex-col items-center">
            <span
              data-testid="tilt-pitch"
              className={`text-xl leading-none font-bold tabular-nums ${tone(pitch)}`}
            >
              {formatDeg(pitch)}
            </span>
            <span className="text-muted mt-0.5 text-[10px] leading-none">Pitch</span>
          </div>
          <div className="flex flex-col items-center">
            <span
              data-testid="tilt-roll"
              className={`text-xl leading-none font-bold tabular-nums ${tone(roll)}`}
            >
              {formatDeg(roll)}
            </span>
            <span className="text-muted mt-0.5 text-[10px] leading-none">Roll</span>
          </div>
        </div>
      </Card.Content>
    </Card>
  )
}
