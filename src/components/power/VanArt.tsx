// The van as the Power page's hub: the existing side-view outline
// (widgets/tilt/VanSide) plus a battery fill clipped to the WHOLE icon silhouette (body, bumper and
// wheels), so the van itself is the battery gauge and the fill rises from the wheels' bottom.
// Coordinates are the van's own canvas (113.312 x 68.002, nose RIGHT).

import { motion, useReducedMotion } from 'motion/react'
import { IDLE_W, PULSE_PAUSE_S, pulseSeconds, type PowerSnapshot } from './flowModel'
import { VanSide } from '@/components/widgets/tilt/VanSide'

export const VAN_W = 113.312
export const VAN_H = 68.002

/** Body, rear and front bumper steps, and the two wheel discs: everything the outline encloses. */
const SILHOUETTE = [
  // Body, down to the floor line.
  'M3.682 51.755 L3.682 6.661 C3.682 3.672 6.013 1.25 8.888 1.25 L87.421 1.25 C89.318 1.25 90.899 2.148 91.994 3.665 L107.038 25.156 C108.17 26.673 108.68 28.317 108.68 30.402 L108.68 51.755 Z',
  // Rear bumper step, a rounded bar under the floor.
  'M1.25 53.861 C1.25 52.457 1.854 51.755 3.062 51.755 L110.249 51.755 C111.457 51.755 112.062 52.457 112.062 53.861 L112.062 56.646 C112.062 58.05 111.457 58.752 110.249 58.752 L3.062 58.752 C1.854 58.752 1.25 58.05 1.25 56.646 Z',
  // Wheels, outer discs.
  'M33.979 56.782 C33.979 62.288 29.405 66.752 23.763 66.752 C18.12 66.752 13.546 62.288 13.546 56.782 C13.546 51.276 18.12 46.813 23.763 46.813 C29.405 46.813 33.979 51.276 33.979 56.782 Z',
  'M94.463 56.782 C94.463 62.288 89.554 66.752 84.246 66.752 C78.938 66.752 74.03 62.288 74.03 56.782 C74.03 51.276 78.938 46.813 84.246 46.813 C89.554 46.813 94.463 51.276 94.463 56.782 Z',
].join(' ')

/** The icon's extent: roof line to the wheels' bottom. */
const TOP = 1.25
const BOTTOM = 66.752
const HEIGHT = BOTTOM - TOP

export function VanArt({
  flow,
  className,
  glow = true,
}: {
  flow: PowerSnapshot
  className?: string
  glow?: boolean
}) {
  const reduce = useReducedMotion()
  const soc = (flow.soc ?? 0) / 100
  const low = flow.soc !== undefined && flow.soc <= 20
  const colour = low ? 'var(--danger)' : 'var(--accent)'
  // "Charging" here means power is coming IN (solar, alternator, shore), not that the battery's net
  // is positive: a van can be net-discharging at 95% while its sources still feed it, and it should
  // still glow.
  const inputW = flow.edges
    .filter((e) => e.from === 'solar' || e.from === 'alternator' || e.from === 'shore')
    .reduce((sum, e) => sum + e.watts, 0)
  const powered = flow.batteryState !== 'unknown' && inputW > IDLE_W
  const charging = powered && !reduce
  const level = HEIGHT * soc
  const pulse = pulseSeconds(inputW, flow.peakW)
  const bandH = HEIGHT * 0.2
  // Strong halo while power flows in; a faint one when the van has data but nothing feeds it, so
  // a discharging van is not dark. No data, no halo.
  const halo =
    flow.batteryState === 'unknown'
      ? 'none'
      : powered
        ? `drop-shadow(0 0 2px ${colour}) drop-shadow(0 0 6px ${colour})`
        : `drop-shadow(0 0 2px color-mix(in oklch, ${colour} 70%, transparent))`
  // The Tiles' active-tile shadow (`0 0 22px 2px` accent at 45%), as a shape-following drop-shadow
  // so it traces the van, fill included, instead of its bounding box. Only while power flows in,
  // like Tiles' `active`. The tight outline glow below is separate.
  const shadow = powered
    ? `drop-shadow(0 0 22px color-mix(in oklch, ${colour} 45%, transparent))`
    : 'none'
  return (
    <div
      className={`relative ${className ?? ''}`}
      style={{ aspectRatio: `${VAN_W} / ${VAN_H}`, filter: shadow }}
    >
      <svg
        viewBox={`0 0 ${VAN_W} ${VAN_H}`}
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="van-body-clip">
            <path d={SILHOUETTE} />
          </clipPath>
          <clipPath id="van-fill-clip">
            <motion.rect
              x={0}
              width={VAN_W}
              initial={{ y: BOTTOM, height: 0 }}
              animate={{ y: BOTTOM - level, height: level }}
              transition={{ type: 'spring', stiffness: 60, damping: 18 }}
            />
          </clipPath>
          <linearGradient id="van-glow" x1="0" x2="0" y1="1" y2="0">
            <stop offset="0" stopColor={colour} stopOpacity="0" />
            <stop offset="1" stopColor={`color-mix(in oklch, ${colour} 100%, white 15%)`} />
          </linearGradient>
        </defs>
        <g clipPath="url(#van-body-clip)">
          <rect x={0} y={0} width={VAN_W} height={VAN_H} fill="var(--surface)" />
          <motion.rect
            x={0}
            width={VAN_W}
            fill={`color-mix(in oklch, ${colour} 35%, transparent)`}
            initial={{ y: BOTTOM, height: 0 }}
            animate={{ y: BOTTOM - level, height: level }}
            transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          />
          {charging ? (
            <g clipPath="url(#van-fill-clip)">
              <motion.rect
                x={0}
                width={VAN_W}
                height={bandH}
                fill="url(#van-glow)"
                opacity={0.55}
                initial={{ y: BOTTOM }}
                animate={{ y: [BOTTOM, TOP - bandH, TOP - bandH] }}
                transition={{
                  duration: pulse + PULSE_PAUSE_S,
                  times: [0, pulse / (pulse + PULSE_PAUSE_S), 1],
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </g>
          ) : null}
        </g>
      </svg>
      <div
        className="absolute inset-0 [&_path]:!stroke-[0.55]"
        style={{ color: colour, filter: glow ? halo : 'none' }}
      >
        <VanSide className="size-full" />
      </div>
    </div>
  )
}
