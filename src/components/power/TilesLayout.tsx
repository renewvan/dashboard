// The Power page's Tiles layout: a boxed tile per source, the battery, the inverter and the loads,
// joined by links (see PowerLinks) along which dashes crawl in the direction of power. The diagram
// fills its panel, so it grows and shrinks as the bottom navbar slides (the panel pads itself by
// the navbar's inset).
//
// Columns: sources | the middle (inverter over battery, or just the battery) | loads. Link geometry
// is MEASURED from the rendered tiles (ResizeObserver), so it stays glued to tile edges at any
// size and while the inset animates.

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { motion, useReducedMotion } from 'motion/react'
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
  formatPower,
  sourceOpener,
  IDLE_W,
  PULSE_PAUSE_S,
  pulseSeconds,
  type NodeId,
  type PowerSnapshot,
} from './flowModel'
import { formatTimeToGo } from '@/lib/time-to-go'
import { SolarHistory } from '@/components/widgets/solar/SolarHistory'
import { yieldHistoryView } from '@/components/widgets/solar/solarView'
import type { Solar } from '@/types'
import { PowerLinks } from './PowerLinks'
import { RollingNumber, Value } from './PowerValue'

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
  history,
  onPress,
  className = '',
}: {
  id: NodeId
  register: (id: NodeId) => (el: HTMLElement | null) => void
  title: string
  icon: ReactNode
  watts: number | undefined
  active: boolean
  sub?: string
  /** Drawn at the very bottom of the tile, under the sub line (the Solar tile's week of harvest). */
  history?: ReactNode
  /** Opens the device behind the tile; absent, the tile is a readout. */
  onPress?: () => void
  className?: string
}) {
  const { unit } = formatPower(watts)
  const Face = onPress ? motion.button : motion.div
  return (
    <Face
      ref={register(id) as never}
      {...(onPress ? { type: 'button' as const, onClick: onPress } : {})}
      animate={{
        boxShadow: active
          ? '0 0 22px 2px color-mix(in oklch, var(--accent) 45%, transparent)'
          : '0 0 0 0 transparent',
        borderColor: active ? 'var(--accent)' : 'var(--border)',
      }}
      transition={{ duration: 0.6 }}
      className={`bg-surface @container-[size] relative flex max-h-56 min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-3xl border-2 p-4 ${className} ${
        onPress
          ? 'focus-visible:ring-accent cursor-pointer text-left outline-none focus-visible:ring-4 active:brightness-90'
          : ''
      }`}
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
          the history strip. Each only appears when the tile's content box is tall enough to hold
          it beside the value (the bottom navbar eats height on short screens); otherwise it is
          dropped rather than overflowing the border. Thresholds: value block 73px + sub 20px +
          gap 4px ≈ 6rem; plus the 56px strip + gap ≈ 10rem. */}
      <div className="hidden min-h-0 flex-col gap-1 [@container(min-height:6rem)]:flex">
        {sub ? <span className="text-muted text-sm capitalize">{sub}</span> : null}
        {history ? (
          <div className="hidden h-14 min-h-0 shrink overflow-hidden [@container(min-height:10rem)]:flex">
            {history}
          </div>
        ) : null}
      </div>
    </Face>
  )
}

function BatteryTile({
  flow,
  register,
  onPress,
}: {
  flow: PowerSnapshot
  register: (id: NodeId) => (el: HTMLElement | null) => void
  /** Opens the battery in Settings; absent, the tile is a readout. */
  onPress?: () => void
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
  const glowing = flow.batteryState === 'charging' && !reduce
  const fillColour = low ? 'var(--danger)' : 'var(--accent)'
  const pulse = pulseSeconds(power ?? 0, flow.peakW)
  const Face = onPress ? motion.button : motion.div
  return (
    <Face
      ref={register('battery') as never}
      {...(onPress ? { type: 'button' as const, onClick: onPress } : {})}
      animate={{
        borderColor: fillColour,
        boxShadow: glowing
          ? `0 0 22px 2px color-mix(in oklch, ${fillColour} 40%, transparent)`
          : '0 0 0 0 transparent',
      }}
      className={`bg-surface relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-3xl border-2 p-4 [@media(max-height:560px)]:p-3 ${
        onPress
          ? 'focus-visible:ring-accent cursor-pointer text-left outline-none focus-visible:ring-4 active:brightness-90'
          : ''
      }`}
    >
      {/* Venus fills the tile bottom-up with the SoC; the edge is a spring so a step in SoC
          settles instead of jumping. While the battery charges, a soft band rises through the fill
          from its bottom to its top and repeats (the fill clips it at the surface), and the tile
          glows; otherwise neither is drawn. Speed follows the charge power. */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{ background: `color-mix(in oklch, ${fillColour} 35%, transparent)` }}
        initial={false}
        animate={{ height: `${soc ?? 0}%` }}
        transition={{ type: 'spring', stiffness: 60, damping: 18 }}
      >
        {glowing ? (
          <motion.div
            className="absolute inset-x-0 h-10"
            style={{
              top: '100%',
              background: `linear-gradient(to top, transparent, color-mix(in oklch, ${fillColour} 100%, white 15%))`,
              opacity: 0.5,
            }}
            // One loop: the band's top starts flush with the fill's bottom (so it slides in from
            // under it, as in Venus), rises until its bottom is flush with the fill's top (fully
            // out), then holds there hidden for the pause. Keyframes, not `repeatDelay`: the loop
            // restarts from the first keyframe, which is the hidden start. `top` is a % of the
            // fill and `y` a % of the band itself, one unit each; motion drops the minus sign of
            // a `calc(0% - 2.5rem)`, which made the band start 40px up.
            initial={{ top: '100%', y: '0%' }}
            animate={{ top: ['100%', '0%', '0%'], y: ['0%', '-100%', '-100%'] }}
            transition={{
              duration: pulse + PULSE_PAUSE_S,
              times: [0, pulse / (pulse + PULSE_PAUSE_S), 1],
              repeat: Infinity,
              ease: 'linear',
            }}
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
    </Face>
  )
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
  solar: 'Solar',
  alternator: 'Alternator',
  shore: 'Shore',
  inverter: 'Inverter / Charger',
  loads: 'Loads',
  acLoads: 'AC loads',
  dcLoads: 'DC loads',
}

/**
 * What the Solar tile draws from: the controller's daily harvest history. The Start page's solar
 * widget owns the live power bars; this tile shows the live watts in its value and the week below.
 */
export function TilesLayout({
  flow,
  solar,
  onOpenInstance,
}: {
  flow: PowerSnapshot
  /** Absent until a solar controller has published its required fields: then no history is drawn. */
  solar?: Solar
  /** Opens a source's device in Settings (its `instanceKey`); absent, the sources are readouts. */
  onOpenInstance?: (key: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const { boxes, register } = useBoxes(container)
  const n = flow.nodes

  const sources = (['solar', 'alternator', 'shore'] as const).filter((id) => n[id].present)
  const hasInverter = n.inverter.present

  const solarHistory = yieldHistoryView(solar?.yield_history_wh)

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
      history={id === 'solar' && solarHistory ? <SolarHistory view={solarHistory} /> : undefined}
      onPress={sourceOpener(flow, id, onOpenInstance)}
    />
  )

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
          <PowerLinks
            edges={flow.edges}
            boxes={boxes}
            present={(id) => n[id].present}
            peakW={flow.peakW}
          />
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
              <BatteryTile
                flow={flow}
                register={register}
                onPress={sourceOpener(flow, 'battery', onOpenInstance)}
              />
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
                <BatteryTile
                  flow={flow}
                  register={register}
                  onPress={sourceOpener(flow, 'battery', onOpenInstance)}
                />
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
