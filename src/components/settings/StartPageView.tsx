import { Minus, Plus } from 'lucide-react'
import { Button, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { FLUID_LABELS } from '@/lib/tank-labels'
import {
  MAX_FULL_SCALE_W,
  MIN_FULL_SCALE_W,
  POWER_SOURCES,
  POWER_SOURCE_LABELS,
  RING_SOURCES,
  clampFullScale,
  type PowerSlot,
  type PowerSource,
  type RingSource,
  type StartPowerSources,
} from '@/hooks/useStartPowerSources'

/** A scale step: 10% of the range would be 2 kW, far too coarse for a van's 400 W array. */
function stepFor(watts: number): number {
  if (watts < 500) return 50
  if (watts < 2000) return 100
  return 500
}

type SlotKey = 'leftTop' | 'leftBottom' | 'right'

const SLOTS: { key: SlotKey; label: string; hint: string }[] = [
  { key: 'leftTop', label: 'Left, top', hint: 'Incoming power' },
  { key: 'leftBottom', label: 'Left, bottom', hint: 'Incoming power' },
  { key: 'right', label: 'Right', hint: 'Outgoing power' },
]

interface SlotCardProps {
  label: string
  hint: string
  slot: PowerSlot
  onChange: (slot: PowerSlot) => void
}

function SlotCard({ label, hint, slot, onChange }: SlotCardProps) {
  const step = stepFor(slot.fullScaleW)
  const setScale = (watts: number) => onChange({ ...slot, fullScaleW: clampFullScale(watts) })

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-2xl border px-3.5 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted text-xs">{hint}</span>
      </div>

      <ToggleButtonGroup
        aria-label={`${label} source`}
        selectionMode="single"
        disallowEmptySelection
        fullWidth
        selectedKeys={new Set([slot.source])}
        onSelectionChange={(keys) => {
          const key = [...keys][0]
          // HeroUI re-fires the selection on a re-tap of the selected item.
          const next = POWER_SOURCES.find((source: PowerSource) => source === key)
          if (next !== undefined && next !== slot.source) onChange({ ...slot, source: next })
        }}
      >
        {POWER_SOURCES.map((source, index) => (
          <ToggleButton key={source} id={source} className="min-h-11">
            {index > 0 && <ToggleButtonGroup.Separator />}
            {POWER_SOURCE_LABELS[source]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">Full band</span>
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            variant="secondary"
            className="size-11 min-w-11"
            aria-label={`Decrease ${label} full band`}
            isDisabled={slot.fullScaleW <= MIN_FULL_SCALE_W}
            onPress={() => setScale(slot.fullScaleW - step)}
          >
            <Minus className="size-5" />
          </Button>
          <span
            className="min-w-20 text-center text-lg tabular-nums"
            aria-label={`${label} full band`}
            role="status"
          >
            {slot.fullScaleW} W
          </span>
          <Button
            isIconOnly
            variant="secondary"
            className="size-11 min-w-11"
            aria-label={`Increase ${label} full band`}
            isDisabled={slot.fullScaleW >= MAX_FULL_SCALE_W}
            onPress={() => setScale(slot.fullScaleW + step)}
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

const RING_LABELS: Record<RingSource, string> = { battery: 'Battery', ...FLUID_LABELS }

/** Outermost first, matching how the rings are drawn. */
const RING_POSITIONS = ['Outer ring', 'Middle ring', 'Inner ring'] as const

interface RingCardProps {
  label: string
  source: RingSource
  onChange: (source: RingSource) => void
}

function RingCard({ label, source, onChange }: RingCardProps) {
  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-2xl border px-3.5 py-3">
      <span className="text-sm font-medium">{label}</span>
      <ToggleButtonGroup
        aria-label={`${label} source`}
        selectionMode="single"
        disallowEmptySelection
        className="grid grid-cols-3 gap-2"
        selectedKeys={new Set([source])}
        onSelectionChange={(keys) => {
          const key = [...keys][0]
          // HeroUI re-fires the selection on a re-tap of the selected item.
          const next = RING_SOURCES.find((candidate) => candidate === key)
          if (next !== undefined && next !== source) onChange(next)
        }}
      >
        {RING_SOURCES.map((candidate) => (
          <ToggleButton key={candidate} id={candidate} className="min-h-11">
            {RING_LABELS[candidate]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  )
}

interface StartPageViewProps {
  sources: StartPowerSources
  onChange: (sources: StartPowerSources) => void
}

/**
 * Settings › General › Display › Start page: where each of the half-moon readings comes from and
 * how many watts fill its band. The bus has no shore or inverter topics, so the choices are the
 * solar controller and the battery's power by direction.
 */
export function StartPageView({ sources, onChange }: StartPageViewProps) {
  return (
    <div className="flex flex-col gap-2">
      {SLOTS.map(({ key, label, hint }) => (
        <SlotCard
          key={key}
          label={label}
          hint={hint}
          slot={sources[key]}
          onChange={(slot) => onChange({ ...sources, [key]: slot })}
        />
      ))}
      <p className="text-muted px-1 text-xs">
        Charging and Load are the battery&apos;s power going in and out. Full band is the wattage
        that fills a reading&apos;s arc.
      </p>
      <h2 className="mt-2 px-1 text-sm font-medium">Rings</h2>
      {RING_POSITIONS.map((label, index) => (
        <RingCard
          key={label}
          label={label}
          source={sources.rings[index as 0 | 1 | 2]}
          onChange={(source) => {
            const rings: StartPowerSources['rings'] = [...sources.rings]
            rings[index] = source
            onChange({ ...sources, rings })
          }}
        />
      ))}
    </div>
  )
}
