import { Card } from '@heroui/react'
import { formatDeg, isLevel, rearViewRotation, sideViewRotation, tiltReading } from '@/lib/tilt'
import type { Tilt } from '@/types'
import { VanRear, VanSide } from './index.tsx'

export interface TiltWidgetProps {
  /** Latest tilt record; undefined until the node publishes anything. */
  tilt: Partial<Tilt> | undefined
}

function tone(deg: number | null): string {
  if (deg === null) return 'text-muted'
  return isLevel(deg) ? 'text-emerald-400' : 'text-amber-400'
}

const VAN = 'h-full origin-bottom transition-transform duration-500'

/**
 * Start-page card showing the van's inclination: a side van (pitch) and a rear
 * van (roll) that physically tilt over a ground line, with the angles below.
 * Each angle is tinted green inside the level tolerance and amber outside.
 */
export function TiltWidget({ tilt }: TiltWidgetProps) {
  const { roll, pitch } = tiltReading(tilt)
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
        <div className="bg-foreground/40 my-1 h-0.5 w-full shrink-0 rounded" />
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
