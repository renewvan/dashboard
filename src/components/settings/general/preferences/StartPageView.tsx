import { Minus, Plus } from 'lucide-react'
import { Button, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { FLUID_LABELS } from '@/lib/tank-labels'
import { Card, ChoiceRow } from '../../shared/ChoiceRow'
import { GroupRow } from '../../shared/GroupRow'
import { sensorLabel, sortedSensorIds } from '@/lib/temperature'
import type { TemperatureSensor } from '@/types'
import type { SettingsSubView } from '../../views'
import { START_TILES } from '@/components/start/widgets/registry'
import type { StartWidgetId } from '@/hooks/useStartLayout'
import {
  TILE_COLUMNS,
  TILE_ROWS,
  tileSizeOf,
  tilesOfLayout,
  withTileSize,
  type StartTiles,
  type TileCols,
  type TileRows,
} from '@/hooks/useStartTiles'
import { START_VIEW_CHOICES, START_VIEW_LABELS, type StartView } from '@/hooks/useStartView'
import {
  MAX_FULL_SCALE_W,
  MIN_FULL_SCALE_W,
  POWER_SOURCES,
  POWER_SOURCE_LABELS,
  RING_SOURCES,
  clampFullScale,
  type PowerSource,
  type RingSource,
  type RingUnit,
  type StartCentre,
  type StartPowerSources,
  type StartTemperatures,
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
  { key: 'leftBottom', label: 'Left, bottom', hint: 'Alternator or shore charger' },
  { key: 'right', label: 'Right', hint: 'Outgoing power' },
]

/** What a card edits: the band's scale, and the source unless the reading follows the charger present. */
interface SlotValue {
  fullScaleW: number
  source?: PowerSource
}

interface SlotCardProps {
  label: string
  hint: string
  slot: SlotValue
  onChange: (slot: SlotValue) => void
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

      {slot.source !== undefined && (
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
      )}

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

/** How a tank ring's value reads; the battery ring has no volume and always reads in %. */
const RING_UNIT_CHOICES: { value: RingUnit; label: string }[] = [
  { value: 'pct', label: '%' },
  { value: 'litres', label: 'Liters (\u2113)' },
]

const CENTRE_CHOICES: { value: StartCentre; label: string }[] = [
  { value: 'tilt', label: 'Tilt' },
  { value: 'van', label: 'Van' },
  { value: 'battery', label: 'Battery readout' },
]

const START_VIEW_OPTIONS = START_VIEW_CHOICES.map((value) => ({
  value,
  label: START_VIEW_LABELS[value],
}))

interface StartPageViewProps {
  view: StartView
  onViewChange: (view: StartView) => void
  sources: StartPowerSources
  /** The widgets on the Start page, in order: the Grid's tiles (Energy is two). */
  layout: readonly StartWidgetId[]
  tiles: StartTiles
  onTilesChange: (tiles: StartTiles) => void
  temperatures: Record<string, Partial<TemperatureSensor>>
  onOpen: (view: SettingsSubView) => void
}

interface CockpitSettingsProps {
  sources: StartPowerSources
  onChange: (sources: StartPowerSources) => void
}

/** The Cockpit's power readings: where each half-moon band reads from and what fills it. */
export function PowerReadingsView({ sources, onChange }: CockpitSettingsProps) {
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
        Load is the battery&apos;s power going out. The left-bottom reading shows the alternator, or
        the shore charger when there is none, and is hidden while neither is connected. Full band is
        the wattage that fills a reading&apos;s arc.
      </p>
    </div>
  )
}

/** The Cockpit's centre of the rings, and what each of the three rings and their unit read. */
export function RingsView({ sources, onChange }: CockpitSettingsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-medium">Centre</h2>
      <Card>
        <ChoiceRow
          label="Shows"
          choices={CENTRE_CHOICES}
          value={sources.centre}
          onChange={(centre) => onChange({ ...sources, centre })}
        />
      </Card>
      <p className="text-muted px-1 text-xs">
        What fills the middle of the rings. Tilt shows the van&apos;s pitch and roll, and the
        battery readout while there is no reading. Van draws the van filling as the battery charges.
        Battery readout shows the charge as a number, and the battery is then left out of the list
        under the rings.
      </p>
      <h2 className="mt-2 px-1 text-sm font-medium">Level Rings</h2>
      <Card>
        <ChoiceRow
          label="Unit"
          choices={RING_UNIT_CHOICES}
          value={sources.ringUnit}
          onChange={(ringUnit) => onChange({ ...sources, ringUnit })}
        />
      </Card>
      <p className="text-muted px-1 text-xs">
        Applies to every tank ring. The battery ring always shows %.
      </p>
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

interface TemperaturesViewProps extends CockpitSettingsProps {
  temperatures: Record<string, Partial<TemperatureSensor>>
}

const TEMPERATURE_SIDES: { side: keyof StartTemperatures; label: string }[] = [
  { side: 'left', label: 'Left' },
  { side: 'right', label: 'Right' },
]

/** Which temperature probe floats over each side of the Cockpit. */
export function TemperaturesView({ sources, onChange, temperatures }: TemperaturesViewProps) {
  const reported = sortedSensorIds(temperatures)
  return (
    <div className="flex flex-col gap-2">
      {TEMPERATURE_SIDES.map(({ side, label }) => {
        const picked = sources.temperatures[side]
        // A pick whose probe is not on the bus (yet) stays selectable, so the setting never hides.
        const ids = reported.includes(picked) ? reported : [...reported, picked]
        const choices = ids.map((id) => ({
          value: id,
          label: temperatures[id] ? sensorLabel(id, temperatures[id]) : id,
        }))
        return (
          <Card key={side}>
            <ChoiceRow
              label={`${label} sensor`}
              choices={choices}
              value={picked}
              onChange={(id) =>
                onChange({ ...sources, temperatures: { ...sources.temperatures, [side]: id } })
              }
            />
          </Card>
        )
      })}
      <p className="text-muted px-1 text-xs">
        The probe read above the left half-moon and the one above the right. The outdoor probe is on
        the left and the indoor one on the right until changed.
      </p>
    </div>
  )
}

/** The one-line summary of a probe pick for its group row. */
function sensorSummary(
  id: string,
  temperatures: Record<string, Partial<TemperatureSensor>>,
): string {
  return temperatures[id] ? sensorLabel(id, temperatures[id]) : id
}

const TILE_WIDTH_CHOICES = TILE_COLUMNS.map((cols) => ({
  value: String(cols),
  label: String(cols),
}))
const TILE_HEIGHT_CHOICES = TILE_ROWS.map((rows) => ({ value: String(rows), label: String(rows) }))

interface GridSettingsProps {
  layout: readonly StartWidgetId[]
  tiles: StartTiles
  onTilesChange: (tiles: StartTiles) => void
  onOpen: (view: SettingsSubView) => void
}

/** The Grid's own settings: the order of the widgets, and how many cells each one takes. */
function GridSettings({ layout, tiles, onTilesChange, onOpen }: GridSettingsProps) {
  return (
    <>
      <h2 className="px-1 text-sm font-medium">Order</h2>
      <GroupRow
        label="Widgets"
        description="Choose and arrange the widgets"
        onOpen={() => onOpen('widgets')}
      />
      <h2 className="mt-2 px-1 text-sm font-medium">Tile sizes</h2>
      {tilesOfLayout(layout).map((id) => {
        const { label } = START_TILES[id]
        const size = tileSizeOf(tiles, id)
        return (
          <div key={id} className="border-border bg-surface overflow-hidden rounded-2xl border">
            <h3 className="px-3.5 pt-3 text-sm font-medium">{label}</h3>
            <ChoiceRow
              label={`${label} width`}
              choices={TILE_WIDTH_CHOICES}
              value={String(size.cols)}
              onChange={(cols) =>
                onTilesChange(withTileSize(tiles, id, { ...size, cols: Number(cols) as TileCols }))
              }
            />
            <ChoiceRow
              label={`${label} height`}
              choices={TILE_HEIGHT_CHOICES}
              value={String(size.rows)}
              onChange={(rows) =>
                onTilesChange(withTileSize(tiles, id, { ...size, rows: Number(rows) as TileRows }))
              }
            />
          </div>
        )
      })}
      <p className="text-muted px-1 text-xs">
        The grid is four columns wide. Width is how many columns a tile spans and height how many
        rows (each 150px). Tiles fill the gaps in the order of Widgets, so a small tile can move up
        beside a large one.
      </p>
      <Button
        variant="secondary"
        className="min-h-11"
        isDisabled={Object.keys(tiles).length === 0}
        onPress={() => onTilesChange({})}
      >
        Reset tile sizes
      </Button>
    </>
  )
}

/**
 * Settings › General › Display & Appearance › Start page: which Start view the kiosk shows, then
 * that view's own settings. Cockpit: where the half-moon readings come from and how many watts fill
 * each band (the left-bottom reading is not chosen: it follows the alternator or the shore
 * charger, whichever the bus reports, so only its band is set). Grid: the widgets' order and
 * the size of each tile.
 */
export function StartPageView({
  view,
  onViewChange,
  sources,
  layout,
  tiles,
  onTilesChange,
  temperatures,
  onOpen,
}: StartPageViewProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-medium">View</h2>
      <Card>
        <ChoiceRow
          label="Start view"
          choices={START_VIEW_OPTIONS}
          value={view}
          onChange={onViewChange}
        />
      </Card>
      <p className="text-muted px-1 text-xs">
        Cockpit is the Dial: power readings round three level rings. Grid lays the Start-page
        widgets out on a grid, the Map, Power and Battery larger than the rest. A phone always shows
        its widgets in a stack.
      </p>
      {view === 'cockpit' ? (
        <>
          <h2 className="mt-2 px-1 text-sm font-medium">Cockpit</h2>
          <GroupRow
            label="Power readings"
            description="Sources and bands of the half-moons"
            onOpen={() => onOpen('start-power-readings')}
          />
          <GroupRow
            label="Centre & rings"
            description={`${CENTRE_CHOICES.find((c) => c.value === sources.centre)?.label ?? ''} in the centre`}
            onOpen={() => onOpen('start-rings')}
          />
          <GroupRow
            label="Temperatures"
            description={`${sensorSummary(sources.temperatures.left, temperatures)} and ${sensorSummary(sources.temperatures.right, temperatures)}`}
            onOpen={() => onOpen('start-temperatures')}
          />
        </>
      ) : (
        <GridSettings layout={layout} tiles={tiles} onTilesChange={onTilesChange} onOpen={onOpen} />
      )}
    </div>
  )
}
