import { formatDeg, isLevel, rearViewRotation, sideViewRotation, tiltReading } from '../../lib/tilt'
import type { Tilt } from '../../types'
import { VanRear, VanSide } from './VanArt'

export interface TiltCardProps {
  /** Latest tilt record; undefined until the node publishes anything. */
  tilt: Partial<Tilt> | undefined
}

function tone(deg: number | null): string {
  if (deg === null) return 'text-muted-foreground'
  return isLevel(deg) ? 'text-emerald-400' : 'text-amber-400'
}

const VAN = 'h-[38%] origin-bottom transition-transform duration-500'

/**
 * Home-tab card showing the van's inclination: a side van (pitch) and a rear
 * van (roll) that physically tilt over a ground line, with the angles below.
 * Each angle is tinted green inside the level tolerance and amber outside.
 */
export function TiltCard({ tilt }: TiltCardProps) {
  const { roll, pitch } = tiltReading(tilt)
  return (
    <div data-testid="tilt-card" className="flex h-full flex-col">
      <div className="text-muted-foreground text-xs">Van Tilt</div>
      <div className="grid min-h-0 flex-1 grid-cols-[1.45fr_1fr] items-end justify-items-center gap-4 px-1 pt-1">
        <VanSide
          className={`${VAN} ${tone(pitch)}`}
          style={{ transform: `rotate(${sideViewRotation(pitch)}deg)` }}
        />
        <VanRear
          className={`${VAN} ${tone(roll)}`}
          style={{ transform: `rotate(${rearViewRotation(roll)}deg)` }}
        />
      </div>
      <div className="bg-foreground/40 my-1 h-0.5 w-full rounded" />
      <div className="grid grid-cols-[1.45fr_1fr] gap-4 text-center text-2xl font-bold tabular-nums">
        <span data-testid="tilt-pitch" className={tone(pitch)}>
          {formatDeg(pitch)}
        </span>
        <span data-testid="tilt-roll" className={tone(roll)}>
          {formatDeg(roll)}
        </span>
      </div>
    </div>
  )
}
