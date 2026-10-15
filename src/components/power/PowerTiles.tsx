// The Power page's Tiles layout: a boxed tile per source, the battery, the inverter and the loads,
// joined by elbow links along which dashes crawl in the direction of power. The diagram fills its
// panel, so it grows and shrinks as the bottom navbar slides (the panel pads itself by the
// navbar's inset).
//
// Columns: sources | the middle (inverter over battery, or just the battery) | loads. Link geometry
// is MEASURED from the rendered tiles (ResizeObserver), so it stays glued to tile edges at any
// size and while the inset animates.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import {
  Battery as BatteryIcon,
  Engine,
  PlugZap,
  Plug2,
  Sun,
  Zap,
  CircuitBoard,
} from 'lucide-react'
import {
  flowSeconds,
  formatPower,
  IDLE_W,
  pulseSeconds,
  type FlowEdge,
  type NodeId,
  type PowerSnapshot,
} from './flowModel'
import { formatTimeToGo } from '@/lib/time-to-go'
import { SolarBars } from '@/components/widgets/solar/SolarWidget'
import { BAR_COLUMNS, solarView } from '@/components/widgets/solar/solarView'
import type { Solar } from '@/types'

/** Tweens a number so a 640 -> 1850 W jump rolls instead of snapping. */
function RollingNumber({ value }: { value: number | undefined }) {
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
 * upright accent unit. `size` is the number's size; the unit is a fixed step smaller. `fluid`
 * sizes the number by the viewport's height (a short kiosk with the navbar open leaves the tile
 * little room), so it shrinks with the screen instead of being clipped by the tile. It is not
 * sized by the tile's own height: block-axis container units need size containment, which would
 * let a flex row collapse the tile, so they never resolved against the inline-size container.
 */
function Value({
  value,
  unit,
  fluid = false,
}: {
  value: ReactNode
  unit: string
  fluid?: boolean
}) {
  return (
    <div className="flex items-baseline font-light italic tabular-nums">
      <span
        className={fluid ? 'text-[clamp(2rem,9vh,3.75rem)] leading-none' : 'text-5xl leading-none'}
      >
        {value}
      </span>
      <span
        className={`text-accent ml-1 font-semibold not-italic ${fluid ? 'text-[clamp(1rem,4vh,1.5rem)]' : 'text-xl'}`}
      >
        {unit}
      </span>
    </div>
  )
}

interface Box {
  left: number
  right: number
  top: number
  bottom: number
  cx: number
  cy: number
}

/** Pixel boxes of every registered tile, relative to the diagram container. */
function sameBoxes(a: Partial<Record<NodeId, Box>>, b: Partial<Record<NodeId, Box>>): boolean {
  const ka = Object.keys(a) as NodeId[]
  if (ka.length !== Object.keys(b).length) return false
  return ka.every((k) => {
    const x = a[k]
    const y = b[k]
    // Sub-pixel jitter from an animating inset must not re-render: compare at half a pixel.
    return (
      !!x &&
      !!y &&
      Math.abs(x.left - y.left) < 0.5 &&
      Math.abs(x.top - y.top) < 0.5 &&
      Math.abs(x.right - y.right) < 0.5 &&
      Math.abs(x.bottom - y.bottom) < 0.5
    )
  })
}

function useBoxes(container: RefObject<HTMLDivElement | null>) {
  const nodes = useRef(new Map<NodeId, HTMLElement>())
  const observer = useRef<ResizeObserver | null>(null)
  const [boxes, setBoxes] = useState<Partial<Record<NodeId, Box>>>({})

  // One observer for the life of the diagram: the container resizing (the bottom navbar sliding
  // changes the panel's padding every frame) and every tile registered below re-measure. A
  // ResizeObserver reports each element it starts observing, so there is no separate first
  // measurement: the observer is the only thing that writes `boxes`, from outside React.
  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const measure = () => {
      const origin = root.getBoundingClientRect()
      const next: Partial<Record<NodeId, Box>> = {}
      for (const [id, el] of nodes.current) {
        const r = el.getBoundingClientRect()
        const left = r.left - origin.left
        const top = r.top - origin.top
        next[id] = {
          left,
          top,
          right: left + r.width,
          bottom: top + r.height,
          cx: left + r.width / 2,
          cy: top + r.height / 2,
        }
      }
      // Returning the previous object bails the render out, so measuring can never loop.
      setBoxes((prev) => (sameBoxes(prev, next) ? prev : next))
    }
    const ro = new ResizeObserver(measure)
    observer.current = ro
    ro.observe(root)
    for (const el of nodes.current.values()) ro.observe(el)
    return () => {
      ro.disconnect()
      observer.current = null
    }
  }, [container])

  // Stable per id, so React does not detach and reattach the ref on every render.
  const refs = useRef(new Map<NodeId, (el: HTMLElement | null) => void>())
  const register = useCallback((id: NodeId) => {
    let ref = refs.current.get(id)
    if (!ref) {
      ref = (el) => {
        const prev = nodes.current.get(id)
        if (prev && prev !== el) observer.current?.unobserve(prev)
        if (el) {
          nodes.current.set(id, el)
          observer.current?.observe(el)
        } else nodes.current.delete(id)
      }
      refs.current.set(id, ref)
    }
    return ref
  }, [])

  return { boxes, register }
}

function Tile({
  id,
  register,
  title,
  icon,
  watts,
  active,
  sub,
  bars,
  className = '',
}: {
  id: NodeId
  register: (id: NodeId) => (el: HTMLElement | null) => void
  title: string
  icon: ReactNode
  watts: number | undefined
  active: boolean
  sub?: string
  /** Drawn at the very bottom of the tile, under the sub line (the Solar tile's power bars). */
  bars?: ReactNode
  className?: string
}) {
  const { unit } = formatPower(watts)
  return (
    <motion.div
      ref={register(id)}
      animate={{
        boxShadow: active
          ? '0 0 22px 2px color-mix(in oklch, var(--accent) 45%, transparent)'
          : '0 0 0 0 transparent',
        borderColor: active ? 'var(--accent)' : 'var(--border)',
      }}
      transition={{ duration: 0.6 }}
      className={`bg-surface relative flex max-h-56 min-h-0 flex-1 flex-col justify-between rounded-3xl border-2 p-4 ${className}`}
    >
      {/* The title and its value are one block at the top, touching, as in Venus; only the
          sub line is pushed to the bottom. */}
      <div>
        <div className="text-muted flex items-center gap-2 text-base">
          {icon}
          {title}
        </div>
        <Value value={<RollingNumber value={watts} />} unit={unit} />
      </div>
      {/* Everything under the value is pinned to the bottom, as in Venus: the sub line, then
          the bars. The bars take the room left over, up to a ceiling, and give it all back on a
          short tile, so they can never push the value out or make the tile taller. */}
      <div className="flex min-h-0 flex-col gap-1">
        {sub ? <span className="text-muted text-sm capitalize">{sub}</span> : null}
        {bars ? <div className="flex h-12 min-h-0 shrink overflow-hidden">{bars}</div> : null}
      </div>
    </motion.div>
  )
}

function BatteryTile({
  flow,
  register,
}: {
  flow: PowerSnapshot
  register: (id: NodeId) => (el: HTMLElement | null) => void
}) {
  const reduce = useReducedMotion()
  const soc = flow.soc
  const power = flow.nodes.battery.watts
  const state =
    flow.batteryState === 'charging'
      ? 'Charging'
      : flow.batteryState === 'discharging'
        ? 'Discharging'
        : flow.batteryState === 'idle'
          ? 'Idle'
          : 'No data yet'
  const togo = flow.timeToGoS === undefined ? undefined : formatTimeToGo(flow.timeToGoS)
  const low = soc !== undefined && soc <= 20
  const charging = flow.batteryState === 'charging'
  const fillColour = low ? 'var(--danger)' : 'var(--accent)'
  const pulse = pulseSeconds(power ?? 0, flow.peakW)
  return (
    <motion.div
      ref={register('battery')}
      animate={{
        borderColor: fillColour,
        boxShadow: `0 0 22px 2px color-mix(in oklch, ${fillColour} 40%, transparent)`,
      }}
      className="bg-surface relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-3xl border-2 p-4 [@media(max-height:560px)]:p-3"
    >
      {/* Venus fills the tile bottom-up with the SoC; the edge is a spring so a step in SoC
          settles instead of jumping. While charging, a bright band rises through the fill from its
          bottom to its top and repeats (the fill clips it at the surface), so "charging" reads as
          energy moving up into the battery. Speed follows the charge power. */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{ background: `color-mix(in oklch, ${fillColour} 35%, transparent)` }}
        initial={false}
        animate={{ height: `${soc ?? 0}%` }}
        transition={{ type: 'spring', stiffness: 60, damping: 18 }}
      >
        {charging && !reduce ? (
          <motion.div
            className="absolute inset-x-0 h-16"
            style={{
              background: `linear-gradient(to top, transparent, color-mix(in oklch, ${fillColour} 100%, white 60%) 55%, transparent)`,
              filter: 'blur(8px)',
            }}
            // Starts one band-height below the fill and ends at its top, so it enters smoothly
            // instead of popping in at the bottom. A fixed height, so the glow looks the same at
            // 20% and at 99% instead of swelling with the fill.
            initial={{ bottom: '-4rem' }}
            animate={{ bottom: '100%' }}
            transition={{ duration: pulse, repeat: Infinity, ease: 'linear' }}
          />
        ) : null}
      </motion.div>
      {/* The Venus layout in three bands, spread evenly by the tile's `justify-between`: the title
          and the charge together at the top with nothing between them, what the battery is doing
          in the middle, and the three readings at the bottom, spread across the tile. Every line
          is short, so the content is as tall on a small screen as on a big one and nothing wraps;
          the charge shrinks with the screen instead of being clipped by the tile. */}
      <div className="relative z-10">
        <div className="text-foreground flex items-center gap-2 text-base">
          <BatteryIcon className="size-5" />
          Battery
        </div>
        <Value
          fluid
          value={soc === undefined ? '—' : Math.round(soc)}
          unit={soc === undefined ? '' : '%'}
        />
      </div>
      <div className="text-muted relative z-10 flex flex-col text-base">
        {state}
        {togo ? <span className="text-foreground text-sm">{togo}</span> : null}
      </div>
      <div className="text-foreground relative z-10 flex justify-between gap-3 text-base tabular-nums">
        <span>{flow.voltage?.toFixed(2) ?? '—'} V</span>
        <span>{flow.current?.toFixed(1) ?? '—'} A</span>
        <span>{power ?? '—'} W</span>
      </div>
    </motion.div>
  )
}

/** One link: a faint rail plus crawling dashes in the direction of power, speed from watts. */
function Link({ d, edge, peakW }: { d: string; edge: FlowEdge; peakW: number }) {
  const reduce = useReducedMotion()
  const on = edge.watts > IDLE_W
  // One dash step is 20px; a lap of the whole pattern takes flowSeconds / 6.
  const duration = flowSeconds(edge.watts, peakW) / 6
  return (
    <g>
      <path d={d} fill="none" stroke="var(--border)" strokeWidth={3} strokeLinecap="round" />
      {on ? (
        <motion.path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="2 18"
          style={{ filter: 'drop-shadow(0 0 4px var(--accent))' }}
          animate={reduce ? undefined : { strokeDashoffset: [0, -20] }}
          transition={{ duration, repeat: Infinity, ease: 'linear' }}
        />
      ) : null}
    </g>
  )
}

/**
 * Orthogonal path from `a` to `b`, drawn in the direction of power (so the dashes crawl from the
 * source to the sink). Tiles stacked in one column (inverter over battery) get a straight vertical
 * link through the middle of their overlap; side-by-side tiles elbow inside the gap between them,
 * at `lane` (0 = hugging `a`, 1 = hugging `b`) so edges sharing a gap but heading to different
 * tiles run in separate vertical channels instead of drawing over each other.
 */
function pathBetween(a: Box, b: Box, lane = 0.5): string {
  const overlapsHorizontally = a.left < b.right && b.left < a.right
  if (overlapsHorizontally) {
    const x = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2
    return b.top >= a.bottom ? `M ${x} ${a.bottom} V ${b.top}` : `M ${x} ${a.top} V ${b.bottom}`
  }
  if (b.left >= a.right) {
    const mx = a.right + (b.left - a.right) * lane
    return `M ${a.right} ${a.cy} H ${mx} V ${b.cy} H ${b.left}`
  }
  // b sits left of a: same wire, drawn the other way.
  const mx = a.left - (a.left - b.right) * lane
  return `M ${a.left} ${a.cy} H ${mx} V ${b.cy} H ${b.right}`
}

const ICONS: Partial<Record<NodeId, ReactNode>> = {
  solar: <Sun className="size-5" />,
  alternator: <Engine className="size-5" />,
  shore: <PlugZap className="size-5" />,
  inverter: <Zap className="size-5" />,
  loads: <Plug2 className="size-5" />,
  acLoads: <Plug2 className="size-5" />,
  dcLoads: <CircuitBoard className="size-5" />,
}

const TITLES: Partial<Record<NodeId, string>> = {
  solar: 'Solar yield',
  alternator: 'Alternator',
  shore: 'Shore',
  inverter: 'Inverter / Charger',
  loads: 'Loads',
  acLoads: 'AC loads',
  dcLoads: 'DC loads',
}

/** What the Solar tile draws its bars from: the controller and the power that fills every bar. */
export interface SolarBarsData {
  solar: Solar
  referenceW: number
}

export function PowerTiles({
  flow,
  solarBars,
}: {
  flow: PowerSnapshot
  /** Absent until a solar controller has published its required fields: then no bars are drawn. */
  solarBars?: SolarBarsData
}) {
  const container = useRef<HTMLDivElement>(null)
  const { boxes, register } = useBoxes(container)
  const n = flow.nodes

  const sources = (['solar', 'alternator', 'shore'] as const).filter((id) => n[id].present)
  const hasInverter = n.inverter.present

  const tile = (id: NodeId) => (
    <Tile
      key={id}
      id={id}
      register={register}
      title={TITLES[id] ?? id}
      icon={ICONS[id]}
      watts={n[id].watts}
      active={(n[id].watts ?? 0) > IDLE_W}
      sub={n[id].sub}
      bars={
        id === 'solar' && solarBars ? (
          <SolarBars
            solar={solarBars.solar}
            view={solarView(solarBars.solar, solarBars.referenceW, BAR_COLUMNS)}
            referenceW={solarBars.referenceW}
            columns={BAR_COLUMNS}
          />
        ) : undefined
      }
    />
  )

  // Edges to draw, each from tile a to tile b in the direction of power. The battery <-> inverter
  // pair is two edges (one per direction) on the same short vertical link; only the live one is
  // > 0, the other stays a quiet rail.
  const drawn = flow.edges.flatMap((edge) => {
    const a = boxes[edge.from]
    const b = boxes[edge.to]
    if (!a || !b || !n[edge.from].present || !n[edge.to].present) return []
    const lane = edge.from === 'shore' && edge.to === 'inverter' ? 0.25 : 0.5
    return [{ edge, d: pathBetween(a, b, lane) }]
  })

  return (
    <div className="flex min-h-0 w-full flex-1" data-testid="power-tiles">
      <div
        ref={container}
        className={`relative mx-auto grid min-h-0 w-full max-w-6xl flex-1 ${
          hasInverter
            ? 'grid-cols-[1fr_56px_1.35fr_56px_1fr] grid-rows-2 gap-y-4'
            : 'grid-cols-[1fr_72px_1.35fr_72px_1fr]'
        }`}
      >
        {/* Links sit under the tiles in their own pixel-space overlay. */}
        <svg
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
          aria-hidden
        >
          {drawn.map(({ edge, d }) => (
            <Link key={`${edge.from}-${edge.to}`} d={d} edge={edge} peakW={flow.peakW} />
          ))}
        </svg>

        {hasInverter ? (
          <>
            {/* Sources span both rows; shore is a source, so it links to the inverter (row 1)
                with a short elbow up from its own tile. */}
            <div className="relative col-start-1 row-span-2 row-start-1 flex min-h-0 flex-col justify-center gap-4">
              {sources.map((id) => tile(id))}
            </div>
            {/* Inverter over battery, each half the column, so the link between them is a short
                vertical run and AC / DC loads line up with their own source on the right. */}
            <div className="relative col-start-3 row-start-1 flex min-h-0 flex-col">
              {tile('inverter')}
            </div>
            <div className="relative col-start-3 row-start-2 flex min-h-0 flex-col">
              <BatteryTile flow={flow} register={register} />
            </div>
            <div className="relative col-start-5 row-start-1 flex min-h-0 flex-col">
              {tile('acLoads')}
            </div>
            <div className="relative col-start-5 row-start-2 flex min-h-0 flex-col">
              {tile('dcLoads')}
            </div>
          </>
        ) : (
          <>
            <div className="relative flex min-h-0 flex-col justify-center gap-4">
              {sources.map((id) => tile(id))}
            </div>
            <div />
            {/* Half height, centred between its sources and its loads. */}
            <div className="relative flex min-h-0 flex-col justify-center">
              <div className="flex h-1/2 min-h-0 flex-col">
                <BatteryTile flow={flow} register={register} />
              </div>
            </div>
            <div />
            <div className="relative flex min-h-0 flex-col justify-center">{tile('loads')}</div>
          </>
        )}
      </div>
    </div>
  )
}
