import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { Button, Spinner } from '@heroui/react'
import { Minus, Plus, Thermometer } from 'lucide-react'

/** The arc opens at the bottom: it starts at 135° (bottom left) and sweeps 270° clockwise. */
const START_DEG = 135
const SWEEP_DEG = 270
const CENTRE = 100
const RADIUS = 80
const STROKE = 20

export interface DialSliderProps {
  label: string
  /** The value the heater reports, or the target of a command in flight; `undefined` reads as unknown. */
  value: number | undefined
  min: number
  max: number
  unit: string
  /** The arc, knob glow and readout colour: any CSS colour, normally a theme token. */
  tone: string
  /** Word in the tone colour above the value, e.g. the heater's phase. */
  status?: string
  /** Where the room is now, on the same scale: the arc is dim up to it and bright from it to the value. */
  marker?: number
  /** Text under the value, beside a thermometer: the current reading. */
  reading?: string
  disabled: boolean
  /** A command is in flight: the dial shows its target with a spinner and ignores input. */
  busy: boolean
  /** Called once per gesture, on release (or per key or button press), never while dragging. */
  onCommit: (to: number) => void
}

function point(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CENTRE + RADIUS * Math.cos(rad), CENTRE + RADIUS * Math.sin(rad)]
}

function arc(fromDeg: number, sweepDeg: number): string {
  const [x1, y1] = point(fromDeg)
  const [x2, y2] = point(fromDeg + sweepDeg)
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

/**
 * A thermostat-style circular slider: drag the knob around the arc, press − or +, or use the arrow
 * keys. A drag only moves the knob locally and sends one command on release, so a gesture never
 * floods the heater with writes (a settings write is only confirmed by its next read, hub ADR 0021).
 */
export function DialSlider({
  label,
  value,
  min,
  max,
  unit,
  tone,
  status,
  marker,
  reading,
  disabled,
  busy,
  onCommit,
}: DialSliderProps) {
  const [drag, setDrag] = useState<number | null>(null)
  const [keyboard, setKeyboard] = useState(false)
  const svg = useRef<SVGSVGElement>(null)
  const off = disabled || busy || value === undefined
  const shown = drag ?? value
  const along = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min))) * SWEEP_DEG
  const target = shown === undefined ? 0 : along(shown)
  // Dim up to the room's temperature, bright from there to the target; all bright with no marker.
  const dimTo = marker === undefined ? 0 : Math.min(along(marker), target)

  const valueAt = (event: PointerEvent): number => {
    const box = svg.current?.getBoundingClientRect()
    if (!box) return min
    const dx = event.clientX - (box.left + box.width / 2)
    const dy = event.clientY - (box.top + box.height / 2)
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI
    let a = (((deg - START_DEG) % 360) + 360) % 360
    // The gap at the bottom belongs to whichever end is nearer.
    if (a > SWEEP_DEG) a = a - SWEEP_DEG > (360 - SWEEP_DEG) / 2 ? 0 : SWEEP_DEG
    return min + Math.round((a / SWEEP_DEG) * (max - min))
  }

  const step = (delta: number) => {
    if (off || value === undefined) return
    const held = Math.min(max, Math.max(min, value + delta))
    if (held !== value) onCommit(held)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (off || value === undefined) return
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? -1
          : event.key === 'Home'
            ? min - value
            : event.key === 'End'
              ? max - value
              : undefined
    if (delta === undefined) return
    event.preventDefault()
    step(delta)
  }

  const finish = () => {
    if (drag !== null && drag !== value) onCommit(drag)
    setDrag(null)
  }

  const [knobX, knobY] = point(START_DEG + target)
  const [markX, markY] = point(START_DEG + (marker === undefined ? 0 : along(marker)))

  return (
    <div className="flex flex-1 flex-col items-center">
      {/* The dial is a square that fits the room the card gives it: its width, or its height when
          the bottom bar squeezes the page. It never shrinks below min-h-44, and the wrapper above
          has no `min-h-0`, so a card too short for it scrolls instead of drawing the controls over
          the dial. */}
      <div
        className="min-h-36 w-full min-w-0 flex-1 max-md:min-h-56"
        style={{ containerType: 'size' }}
      >
        {/* The top 5% of the square is empty (the arc starts 5% down), so it is pulled up out of the
            card's padding. The bottom 22% of the square is the arc's opening, so the dial is sized to leave it
            outside the container and the −/+ row (which follows) sits inside it, between the
            arc's ends, as part of the circle, however short the page gets. */}
        <div
          // Below md the card has its natural height (the page scrolls), so `cqh` is not a real
          // measure there and the dial is sized by width alone.
          className="relative mx-auto [--s:min(100cqw,18rem)] md:[--s:max(13.5rem,min(100cqw,20rem,100cqh/0.73))]"
          style={
            {
              width: 'var(--s)',
              height: 'var(--s)',
              // With the bottom bar up (its inset is ~57px, else 0) the whole dial rides ~14px higher,
              // which clears the −/+ row from the mode buttons.
              marginTop: 'calc(var(--s) * -0.02 - var(--navbar-inset-bottom) * 0.1)',
              marginBottom: 'calc(var(--s) * -0.22)',
            } as CSSProperties
          }
        >
          <div
            aria-hidden="true"
            className="absolute inset-[14%] rounded-full"
            style={{
              background: `radial-gradient(circle, color-mix(in oklab, ${tone} 16%, transparent), transparent 70%)`,
            }}
          />
          <svg
            ref={svg}
            viewBox="0 0 200 200"
            role="slider"
            tabIndex={off ? -1 : 0}
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={shown}
            aria-valuetext={shown === undefined ? 'Unknown' : `${shown}${unit}`}
            aria-disabled={off}
            // The browser's focus rectangle around the whole square is ugly (a long touch makes
            // it appear as a white box), so it is replaced by a ring on the knob, shown only
            // after a key press.
            className={`relative w-full touch-none outline-none select-none [-webkit-tap-highlight-color:transparent] ${off ? '' : 'cursor-pointer'}`}
            onKeyDown={(event) => {
              setKeyboard(true)
              onKeyDown(event)
            }}
            onBlur={() => setKeyboard(false)}
            onPointerDown={(event) => {
              setKeyboard(false)
              if (off) return
              event.currentTarget.setPointerCapture?.(event.pointerId)
              setDrag(valueAt(event))
            }}
            onPointerMove={(event) => {
              if (drag !== null) setDrag(valueAt(event))
            }}
            onPointerUp={finish}
            onPointerCancel={() => setDrag(null)}
          >
            <path
              d={arc(START_DEG, SWEEP_DEG)}
              fill="none"
              stroke="var(--border)"
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
            {shown !== undefined && target > 0 && (
              <path
                d={arc(START_DEG, target)}
                fill="none"
                stroke={tone}
                strokeWidth={STROKE}
                strokeLinecap="round"
              />
            )}
            {shown !== undefined && dimTo > 0 && (
              <>
                <path
                  d={arc(START_DEG, dimTo)}
                  fill="none"
                  stroke="var(--background)"
                  strokeOpacity={0.45}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                />
                <circle cx={markX} cy={markY} r={4} fill="var(--background)" fillOpacity={0.6} />
              </>
            )}
            {shown !== undefined && (
              <circle
                cx={knobX}
                cy={knobY}
                r={STROKE / 2 + 1}
                fill="#fff"
                stroke={keyboard ? tone : undefined}
                strokeWidth={keyboard ? 3 : undefined}
                style={{ filter: 'drop-shadow(0 1px 3px rgb(0 0 0 / 0.5))' }}
              />
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
            {status !== undefined && (
              <span className="text-base font-semibold" style={{ color: tone }}>
                {status}
              </span>
            )}
            <span className="flex items-start gap-0.5 tabular-nums">
              <span className="text-6xl leading-none font-light">
                {shown === undefined ? '—' : shown}
              </span>
              {unit !== '' && shown !== undefined && (
                <span className="text-xl leading-none font-light">{unit}</span>
              )}
            </span>
            {reading !== undefined && (
              <span
                className="flex items-center gap-1 text-base font-semibold tabular-nums"
                style={{ color: tone }}
              >
                <Thermometer aria-hidden="true" className="size-4" />
                {reading}
              </span>
            )}
            {busy && <Spinner size="sm" />}
          </div>
        </div>
      </div>
      <div className="relative z-10 mb-3 flex items-center gap-3">
        <Button
          isIconOnly
          variant="outline"
          className="size-11 min-h-11 min-w-11 rounded-full"
          aria-label={`Decrease ${label}`}
          isDisabled={off || value <= min}
          onPress={() => step(-1)}
        >
          <Minus aria-hidden="true" className="size-5" />
        </Button>
        <Button
          isIconOnly
          variant="outline"
          className="size-11 min-h-11 min-w-11 rounded-full"
          aria-label={`Increase ${label}`}
          isDisabled={off || value >= max}
          onPress={() => step(1)}
        >
          <Plus aria-hidden="true" className="size-5" />
        </Button>
      </div>
    </div>
  )
}
