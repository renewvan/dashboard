// How the Power page writes a reading, shared by the Tiles and Flow layouts so they look alike: a
// light italic number beside a bold, upright accent unit (as in the Start page's half-moons).

import { useEffect, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { formatPower } from './flowModel'

/** Tweens a number so a 640 -> 1850 W jump rolls instead of snapping. */
export function RollingNumber({ value }: { value: number | undefined }) {
  const mv = useMotionValue(value ?? 0)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (value === undefined) return
    if (reduce) mv.set(value)
    else animate(mv, value, { duration: 0.8, ease: 'easeOut' })
  }, [value, mv, reduce])
  const text = useTransform(mv, (v) => formatPower(Math.round(v)).value)
  if (value === undefined) return <span>—</span>
  return <motion.span>{text}</motion.span>
}

/**
 * A reading in the Start page's style (as in its half-moons): a light italic number with a bold,
 * upright accent unit. The number is `text-5xl` unless `fluid` (sized by the viewport's height: a
 * short kiosk with the navbar open leaves the tile little room, so it shrinks with the screen
 * instead of being clipped; not by the tile's own height, since block-axis container units need
 * size containment, which would let a flex row collapse the tile). `sizeClass` overrides both for
 * a drawing in its own units, as the Flow orbs are: `[number, unit]` Tailwind text classes.
 */
export function Value({
  value,
  unit,
  fluid = false,
  sizeClass,
}: {
  value: ReactNode
  unit: string
  fluid?: boolean
  sizeClass?: readonly [number: string, unit: string]
}) {
  const [numberSize, unitSize] =
    sizeClass ??
    (fluid
      ? ['text-[clamp(2rem,9vh,3.75rem)]', 'text-[clamp(1rem,4vh,1.5rem)]']
      : ['text-5xl', 'text-xl'])
  return (
    <div className="flex items-baseline font-light italic tabular-nums">
      <span className={`${numberSize} leading-none`}>{value}</span>
      <span className={`text-accent ml-1 font-semibold not-italic ${unitSize}`}>{unit}</span>
    </div>
  )
}
