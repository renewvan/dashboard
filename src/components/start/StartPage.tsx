import { useIsMobile } from '@/hooks/use-media-query'
import { useNow } from '@/hooks/useNow'
import { DEFAULT_START_LAYOUT, type StartWidgetId } from '@/hooks/useStartLayout'
import type { StartPowerSources } from '@/hooks/useStartPowerSources'
import { Dial } from './Dial'
import { START_WIDGETS } from './widgets/registry'
import type { StartWidgetProps } from './widgets/types'

export interface StartPageProps extends Omit<StartWidgetProps, 'now'> {
  /** Which tank or battery each ring shows, and how full each half-moon band reads. */
  powerSources: StartPowerSources
  /** The phone's widgets, in order; a widget not listed is not shown. Defaults to all of them. */
  layout?: readonly StartWidgetId[]
}

/** Tank levels move slowly; minute resolution is plenty for the severity colour. */
const REFRESH_MS = 30_000

/**
 * The Start page: the Dial on the kiosk, one widget per reading on a phone.
 *
 * Kiosk: the Dial, edge to edge: two half-moons of power readings either side of three rings
 * (battery and tanks), with the van's tilt or the battery in the middle. A reading or ring whose
 * data has not arrived shows a dash or "No data yet", never a number. There is no widget row on the
 * kiosk: the weather has no place there and the tilt lives in the Dial.
 *
 * Phone (below 800px, the shell's breakpoint): the widgets in `layout`, stacked and scrolling.
 * Each is its own component in `widgets/` (see `START_WIDGETS`), draws its own empty state, and
 * knows nothing of the others; this page only places them.
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
  onConfigureTank,
  layout = DEFAULT_START_LAYOUT,
}: StartPageProps) {
  const isMobile = useIsMobile()
  const now = new Date(useNow(REFRESH_MS))

  if (isMobile) {
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
      now,
      onConfigureTank,
    }

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
      />
    </section>
  )
}
