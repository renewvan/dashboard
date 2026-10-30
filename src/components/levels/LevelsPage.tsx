import { createElement, useId, useState } from 'react'
import { Card } from '@heroui/react'
import { Thermometer as ThermometerIcon } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-media-query'
import { useEntityIcon } from '@/hooks/useEntityIcon'
import { entityIcon } from '@/lib/entityIcons'
import { cn } from '@/lib/utils'
import { sensorLabel, sortedSensorIds, temperatureReading } from '@/lib/temperature'
import { TanksPage, type TanksPageProps } from '@/components/tanks/TanksPage'
import type { TemperatureSensor } from '@/types'

type Section = 'tanks' | 'temperature'

/** Display range of the gauges, in °C. */
const MIN_C = -20
const MAX_C = 50

interface Band {
  label: string
  color: string
  fg: string
}

/** One place a temperature becomes a colour + word. */
function band(c: number | null): Band {
  if (c === null) return { label: 'No reading', color: 'var(--muted)', fg: 'var(--foreground)' }
  if (c < 0) return { label: 'Freezing', color: '#3b82f6', fg: '#fff' }
  if (c < 10) return { label: 'Cold', color: '#38bdf8', fg: '#0b1b2b' }
  if (c < 28)
    return { label: 'Comfortable', color: 'var(--accent)', fg: 'var(--accent-foreground)' }
  if (c < 40) return { label: 'Warm', color: 'var(--warning)', fg: 'var(--warning-foreground)' }
  return { label: 'Hot', color: 'var(--danger)', fg: 'var(--danger-foreground)' }
}

const pctOf = (c: number) => Math.min(100, Math.max(0, ((c - MIN_C) / (MAX_C - MIN_C)) * 100))
const fmt = (c: number | null) => (c === null ? '--' : `${Math.round(c)}`)

interface SensorView {
  id: string
  name: string
  c: number | null
  pct: number
  band: Band
  status: TemperatureSensor['status']
}

function toViews(sensors: Record<string, TemperatureSensor>): SensorView[] {
  return sortedSensorIds(sensors).map((id) => {
    const s = sensors[id]
    const c = temperatureReading(s)
    return {
      id,
      name: sensorLabel(id, s),
      c,
      pct: c === null ? 0 : pctOf(c),
      band: band(c),
      status: s.status,
    }
  })
}

/** The icon picked for the probe in Settings, else the thermometer. */
function SensorIcon({ id }: { id: string }) {
  return createElement(entityIcon(useEntityIcon('temperature', id)) ?? ThermometerIcon, {
    'aria-hidden': true,
    className: 'text-muted size-4 shrink-0',
  })
}

function Chip({ b }: { b: Band }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: b.color, color: b.fg }}
    >
      {b.label}
    </span>
  )
}

// Kiosk: an outlined thermometer with a gradient liquid and a °C scale.
// Drawn in a fixed 200x380 box and scaled to the card, so the tube, bulb and scale stay in proportion.
const TUBE_L = 48
const TUBE_R = 92
const TUBE_TOP = 40
const TUBE_BOTTOM = 280
const BULB_R = 32
/** The tube and bulb as one closed shape: the outline, and the clip for the liquid. */
const THERMOMETER_PATH = `M${TUBE_L},${TUBE_BOTTOM} V${TUBE_TOP + 22} A22,22 0 0 1 ${TUBE_R},${TUBE_TOP + 22} V${TUBE_BOTTOM} A${BULB_R},${BULB_R} 0 1 1 ${TUBE_L},${TUBE_BOTTOM} Z`
const yOf = (c: number) => TUBE_BOTTOM - ((c - MIN_C) / (MAX_C - MIN_C)) * (TUBE_BOTTOM - TUBE_TOP)
const MAJOR_TICKS = [-20, -10, 0, 10, 20, 30, 40, 50]
const MINOR_TICKS = [-15, -5, 5, 15, 25, 35, 45]

function ThermometerGauge({ v, id }: { v: SensorView; id: string }) {
  const gradient = `${id}-liquid`
  const clip = `${id}-clip`
  const liquidTop =
    v.c === null ? 380 : Math.min(TUBE_BOTTOM, yOf(Math.min(MAX_C, Math.max(MIN_C, v.c))))
  return (
    <svg
      viewBox="-14 32 168 308"
      role="img"
      aria-label={v.c === null ? `${v.name}: no reading` : `${v.name}: ${fmt(v.c)} degrees Celsius`}
      className="h-full min-h-0 w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: v.band.color }} />
          <stop
            offset="1"
            style={{ stopColor: `color-mix(in srgb, ${v.band.color}, black 30%)` }}
          />
        </linearGradient>
        <clipPath id={clip}>
          <path d={THERMOMETER_PATH} />
        </clipPath>
      </defs>
      <path d={THERMOMETER_PATH} style={{ fill: 'var(--surface-secondary)' }} />
      <g clipPath={`url(#${clip})`}>
        <rect
          x="0"
          y={liquidTop}
          width="200"
          height="380"
          fill={v.c === null ? 'var(--muted)' : `url(#${gradient})`}
        />
      </g>
      <path
        d={THERMOMETER_PATH}
        fill="none"
        strokeWidth="7"
        strokeLinejoin="round"
        style={{ stroke: 'var(--foreground)', opacity: 0.8 }}
      />
      {MINOR_TICKS.map((t) => (
        <line
          key={t}
          x1="106"
          x2="112"
          y1={yOf(t)}
          y2={yOf(t)}
          strokeWidth="2"
          style={{ stroke: 'var(--border)' }}
        />
      ))}
      {MAJOR_TICKS.map((t) => (
        <g key={t}>
          <line
            x1="106"
            x2="118"
            y1={yOf(t)}
            y2={yOf(t)}
            strokeWidth={t === 0 ? 3 : 2}
            style={{ stroke: t === 0 ? 'var(--foreground)' : 'var(--muted)' }}
          />
          <text x="124" y={yOf(t) + 4} fontSize="12" style={{ fill: 'var(--muted)' }}>
            {t}°
          </text>
        </g>
      ))}
      {v.c !== null && (
        <path
          d={`M${TUBE_R + 4},${liquidTop} l-12,-7 v14 z`}
          style={{ fill: v.band.color, stroke: 'var(--foreground)', strokeWidth: 1.5 }}
          transform="translate(8 0)"
        />
      )}
    </svg>
  )
}

/** Stretched over a card so the whole card opens the sensor's Settings page. */
function OpenSensor({ v, onOpen }: { v: SensorView; onOpen?: (id: string) => void }) {
  if (!onOpen) return null
  return (
    <button
      type="button"
      aria-label={`${v.name} settings`}
      onClick={() => onOpen(v.id)}
      className="absolute inset-0 z-10 rounded-[inherit]"
    />
  )
}

function ThermometerCard({ v, onOpen }: { v: SensorView; onOpen?: (id: string) => void }) {
  const id = useId().replace(/:/g, '')
  return (
    <Card className="relative h-full min-h-0 gap-0! p-0!">
      <OpenSensor v={v} onOpen={onOpen} />
      <Card.Header className="flex-row! items-center justify-between gap-2 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <SensorIcon id={v.id} />
          <span className="truncate">{v.name}</span>
        </div>
        <Chip b={v.band} />
      </Card.Header>
      <Card.Content className="min-h-0 flex-1 items-center gap-4 px-4 pt-2 pb-4">
        {/* The number and degree sign are what centre over the tube; the C hangs off to the right. */}
        <div
          className="relative text-5xl leading-none font-semibold"
          style={{ color: v.band.color }}
        >
          {fmt(v.c)}°<span className="absolute bottom-0.5 left-full text-xl">C</span>
        </div>
        <div className="flex min-h-0 w-full flex-1 justify-center py-3">
          <ThermometerGauge v={v} id={id} />
        </div>
      </Card.Content>
    </Card>
  )
}

// Phone: a full-width row with a horizontal gradient scale and a marker.
function ScaleRow({ v, onOpen }: { v: SensorView; onOpen?: (id: string) => void }) {
  return (
    <Card className="relative shrink-0 gap-0! p-0!">
      <OpenSensor v={v} onOpen={onOpen} />
      <Card.Header className="flex-row! items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <SensorIcon id={v.id} />
          <span className="truncate">{v.name}</span>
        </div>
        <Chip b={v.band} />
      </Card.Header>
      <Card.Content className="gap-3 px-4 pb-5">
        <div className="text-5xl leading-none font-semibold">
          {fmt(v.c)}
          <span className="text-muted text-2xl">°C</span>
        </div>
        <div className="relative pt-3">
          <div
            className="h-3 rounded-full"
            style={{
              background:
                'linear-gradient(to right, #3b82f6 0%, #38bdf8 28%, var(--accent) 45%, var(--warning) 80%, var(--danger) 100%)',
            }}
          />
          {v.c !== null && (
            <div
              className="bg-foreground border-background absolute top-1 size-6 -translate-x-1/2 rounded-full border-4 transition-[left]"
              style={{ left: `${v.pct}%` }}
            />
          )}
          <div className="text-muted mt-2 flex justify-between text-[10px]">
            {[-20, -10, 0, 10, 20, 30, 40, 50].map((m) => (
              <span key={m}>{m}°</span>
            ))}
          </div>
        </div>
      </Card.Content>
    </Card>
  )
}

function TemperatureLevels({
  sensors,
  onOpen,
}: {
  sensors: Record<string, TemperatureSensor>
  onOpen?: (id: string) => void
}) {
  const isMobile = useIsMobile()
  const views = toViews(sensors)

  if (views.length === 0) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <ThermometerIcon aria-hidden="true" className="text-muted size-5" />
        <h2 className="text-lg font-semibold">No temperature sensors yet.</h2>
      </section>
    )
  }

  if (!isMobile) {
    return (
      <section
        className="grid h-full min-h-0 flex-1 gap-3 px-4 pb-4"
        style={{ gridTemplateColumns: `repeat(${views.length}, minmax(0, 1fr))` }}
      >
        {views.map((v) => (
          <ThermometerCard key={v.id} v={v} onOpen={onOpen} />
        ))}
      </section>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-16">
      {views.map((v) => (
        <ScaleRow key={v.id} v={v} onOpen={onOpen} />
      ))}
    </div>
  )
}

export interface LevelsPageProps extends TanksPageProps {
  temperatures: Record<string, TemperatureSensor>
  /** A thermometer's tap: opens that sensor's Settings page. */
  onOpenTemperature?: (id: string) => void
}

export function LevelsPage({
  tanks,
  temperatures,
  onConfigure,
  onOpenTemperature,
}: LevelsPageProps) {
  const [section, setSection] = useState<Section>('tanks')
  const isMobile = useIsMobile()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className={cn('flex shrink-0 justify-center px-4 pb-3', isMobile && 'pt-3')}>
        <div
          role="radiogroup"
          aria-label="Levels"
          className="bg-surface-secondary flex gap-1 rounded-full p-1"
        >
          {(['tanks', 'temperature'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-semibold',
                section === s ? 'bg-accent text-accent-foreground' : 'text-muted',
              )}
            >
              {s === 'tanks' ? 'Tank levels' : 'Temperature'}
            </button>
          ))}
        </div>
      </div>
      {section === 'tanks' ? (
        <TanksPage tanks={tanks} onConfigure={onConfigure} />
      ) : (
        <TemperatureLevels sensors={temperatures} onOpen={onOpenTemperature} />
      )}
    </div>
  )
}
