import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-media-query'
import { useNow } from '@/hooks/useNow'
import { DEFAULT_START_LAYOUT, type StartWidgetId } from '@/hooks/useStartLayout'
import {
  tilesOfLayout,
  tileSizeOf,
  type StartTiles,
  type TileCols,
  type TileRows,
} from '@/hooks/useStartTiles'
import { DEFAULT_START_VIEW, type StartView } from '@/hooks/useStartView'
import type { StartPowerSources } from '@/hooks/useStartPowerSources'
import { Dial } from './Dial'
import { START_TILES, START_WIDGETS } from './widgets/registry'
import type { StartWidgetProps } from './widgets/types'

export interface StartPageProps extends Omit<StartWidgetProps, 'now'> {
  /** Which tank or battery each ring shows, and how full each half-moon band reads. */
  powerSources: StartPowerSources
  /** The phone's widgets, in order; a widget not listed is not shown. Defaults to all of them. */
  layout?: readonly StartWidgetId[]
  /** The kiosk's Start page, the Cockpit (default) or the Masonry grid; a phone ignores it. */
  view?: StartView
  /** The Masonry's tile sizes the user changed; a widget not listed keeps its shipped size. */
  tiles?: StartTiles
}

// Whole class names, so Tailwind sees them.
const COL_SPAN: Record<TileCols, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
}
const ROW_SPAN: Record<TileRows, string> = { 1: 'row-span-1', 2: 'row-span-2', 3: 'row-span-3' }

/** Tank levels move slowly; minute resolution is plenty for the severity colour. */
const REFRESH_MS = 30_000

/**
 * The Start page: the Dial on the kiosk, one widget per reading on a phone.
 *
 * Kiosk, Cockpit view (the default): the Dial, edge to edge: two half-moons of power readings
 * either side of three rings (battery and tanks), with the van's tilt or the battery in the
 * middle. A reading or ring whose data has not arrived shows a dash or "No data yet", never a
 * number. It has no widget row: the weather has no place there and the tilt lives in the Dial.
 *
 * Kiosk, Masonry view: the widgets in `layout` on a dense four-column grid, each taking the cells
 * its tile size gives it (`tiles`, the Map, Power and Battery larger unless changed; Energy is two tiles, Power and Battery), scrolling when they do not all fit.
 *
 * Phone (below 800px, the shell's breakpoint): the widgets in `layout`, stacked and scrolling,
 * whatever `view` is. Each widget is its own component in `widgets/` (see `START_WIDGETS`), draws
 * its own empty state, and knows nothing of the others; this page only places them.
 */
export function StartPage({
  tanks,
  batteries,
  primaryBatterySelection,
  solar,
  chargers,
  temperatures,
  gps,
  tilt,
  powerSources,
  powerLayout,
  isDark,
  mapIsDark,
  vanColor,
  onConfigureTank,
  onOpenInstance,
  layout = DEFAULT_START_LAYOUT,
  view = DEFAULT_START_VIEW,
  tiles = {},
}: StartPageProps) {
  const isMobile = useIsMobile()
  const now = new Date(useNow(REFRESH_MS))

  if (isMobile || view === 'masonry') {
    const widgetProps: StartWidgetProps = {
      tanks,
      batteries,
      primaryBatterySelection,
      solar,
      chargers,
      temperatures,
      gps,
      tilt,
      powerLayout,
      isDark,
      mapIsDark,
      vanColor,
      now,
      onConfigureTank,
      onOpenInstance,
    }

    if (isMobile) {
      return (
        <div
          data-testid="pane-start"
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-4 pt-3 pb-4"
        >
          {layout.map((id) => {
            const { Component } = START_WIDGETS[id]
            return <Component key={id} {...widgetProps} />
          })}
        </div>
      )
    }

    // A widget is sized for a full-width phone card, so each fills its cell (`h-full!` beats the
    // fixed height the Map card sets itself).
    return (
      <div
        data-testid="pane-start"
        className="grid min-h-0 flex-1 grid-flow-dense auto-rows-[150px] grid-cols-4 content-start gap-4 overflow-x-hidden overflow-y-auto px-6 py-4"
      >
        {tilesOfLayout(layout).map((id) => {
          const { Component } = START_TILES[id]
          const { cols, rows } = tileSizeOf(tiles, id)
          return (
            <div
              key={id}
              className={cn('min-h-0 min-w-0 [&>*]:h-full!', COL_SPAN[cols], ROW_SPAN[rows])}
            >
              <Component {...widgetProps} />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <section data-testid="pane-start" className="flex min-h-0 flex-1 flex-col px-8">
      <Dial
        tanks={tanks}
        batteries={batteries}
        primaryBatterySelection={primaryBatterySelection}
        solar={solar}
        chargers={chargers}
        tilt={tilt}
        temperatures={temperatures}
        powerSources={powerSources}
        isDark={isDark}
        now={now}
        onOpenInstance={onOpenInstance}
      />
    </section>
  )
}
