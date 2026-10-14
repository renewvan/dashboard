import type { ReactNode } from 'react'
import { Battery, Plus } from 'lucide-react'
import { FLUID_ICONS } from '@/components/tanks/fluidIcon'
import { Card } from '@heroui/react'
import { useIsMobile } from '@/hooks/use-media-query'
import { useNow } from '@/hooks/useNow'
import {
  hasGpsFix,
  isCompleteGps,
  type Battery as BatteryRecord,
  type Gps,
  type Solar,
  type Tank,
  type TemperatureSensor,
  type Tilt,
} from '@/types'
import { WeatherWidget } from '@/components/widgets/weather/WeatherWidget'
import { TiltWidget } from '@/components/widgets/tilt/TiltWidget'
import { SolarWidget } from '@/components/widgets/solar/SolarWidget'
import { firstSolar } from '@/components/widgets/solar/solarView'
import { useSolarReference } from '@/components/widgets/solar/useSolarReference'
import type { StartPowerSources } from '@/hooks/useStartPowerSources'
import { Dial, type DialSize } from './Dial'
import { batteryDial, tankDialOf, type DialView } from './dialView'
import { VenusDial } from './venus/VenusDial'
import { centreKind } from './venus/venusView'

export interface StartPageProps {
  tanks: Record<string, Partial<Tank>>
  batteries: Record<string, Partial<BatteryRecord>>
  solar: Record<string, Partial<Solar>>
  temperatures: Record<string, Partial<TemperatureSensor>>
  gps: Record<string, Partial<Gps>>
  tilt: Record<string, Partial<Tilt>>
  /** Where each half-moon reading comes from and which tank or battery each ring shows. */
  powerSources: StartPowerSources
  /** Glow behind the ring fill: dark theme only. */
  isDark: boolean
}

/** Tank levels move slowly; minute resolution is plenty for the severity colour. */
const REFRESH_MS = 30_000

interface DialSlot {
  id: string
  label: string
  icon: ReactNode
  size: DialSize
  view: DialView | undefined
}

/**
 * The Start page: a widget row over the cockpit row.
 *
 * Widget row (kiosk): three equal columns. The weather widget has no data source yet, so it is an
 * honest empty state, and the other two are empty slots for widgets to come; the page lays them out
 * as a row so adding one is a change to this row, not to the cockpit.
 *
 * Cockpit row (kiosk): fresh water | battery (the focus dial, bigger) | grey water, all three arc
 * ends on one baseline. A dial whose data has not arrived yet shows "No data yet", never a number.
 * Two compact readouts sit above the side dials, sharing one row line: solar above fresh water,
 * the van's tilt above grey water. Neither shows anything until its node has published.
 *
 * Phone (below 800px, the shell's breakpoint): one card per widget, stacked and scrolling; solar
 * sits at the top of the fresh water card.
 */
export function StartPage({
  tanks,
  batteries,
  solar,
  temperatures,
  gps,
  tilt,
  powerSources,
  isDark,
}: StartPageProps) {
  // The first GPS record with a plottable position; the weather is looked up there.
  const fix = Object.values(gps).find((g): g is Gps => isCompleteGps(g) && hasGpsFix(g))
  // One tilt node per van; show the first record.
  const firstTilt = Object.values(tilt)[0]
  // One solar controller per van is the common case; show the first complete record.
  const firstSolarRecord = firstSolar(solar)
  const solarReferenceW = useSolarReference(firstSolarRecord?.power_w)
  const solarWidget = firstSolarRecord && (
    <SolarWidget solar={firstSolarRecord} referenceW={solarReferenceW} />
  )
  const isMobile = useIsMobile()
  const now = new Date(useNow(REFRESH_MS))

  const slots: DialSlot[] = [
    {
      id: 'fresh',
      label: 'Fresh water',
      icon: <FLUID_ICONS.fresh_water className="size-4" />,
      size: 'side',
      view: tankDialOf(tanks, 'fresh_water', now),
    },
    {
      id: 'battery',
      label: 'Battery',
      icon: <Battery className="size-4" />,
      size: 'focus',
      view: batteryDial(batteries),
    },
    {
      id: 'grey',
      label: 'Grey water',
      icon: <FLUID_ICONS.grey_water className="size-4" />,
      size: 'side',
      view: tankDialOf(tanks, 'grey_water', now),
    },
  ]

  if (isMobile) {
    // Battery first on a phone: it is the headline reading, the order the kiosk's centre dial implies.
    const [fresh, battery, grey] = slots
    return (
      <div
        data-testid="pane-start"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto p-4"
      >
        <div className="h-28 shrink-0">
          <EmptySlot />
        </div>
        <div className="h-28 shrink-0">
          <WeatherWidget lat={fix?.latitude} lon={fix?.longitude} temperatures={temperatures} />
        </div>
        <div className="h-28 shrink-0">
          <TiltWidget tilt={firstTilt} />
        </div>
        {[battery, fresh, grey].map((slot) => (
          <Card key={slot.id} className="shrink-0 gap-0! p-0!">
            <Card.Header className="flex-row! items-center gap-2 px-4 py-3 text-sm font-semibold">
              <span className="text-muted" aria-hidden="true">
                {slot.icon}
              </span>
              {slot.label}
            </Card.Header>
            <Card.Content className="items-center gap-4 px-4 pb-5">
              {slot.id === 'fresh' && solarWidget}
              <DialOrEmpty slot={slot} isDark={isDark} size="side" />
            </Card.Content>
          </Card>
        ))}
      </div>
    )
  }

  // The row's tilt widget and the dial's centre never both show the tilt: the dial takes it while
  // the van has a usable reading, and the row keeps it otherwise (a sensor error still shows dashes).
  const tiltInDial = centreKind(firstTilt) === 'tilt'

  return (
    <div data-testid="pane-start" className="flex min-h-0 flex-1 flex-col gap-3 p-2">
      <div className="grid shrink-0 grid-cols-3 gap-2 p-3">
        {/* Solar moved into the half-moons; this cell stays so weather and tilt keep their columns. */}
        <div aria-hidden="true" />
        <WeatherWidget lat={fix?.latitude} lon={fix?.longitude} temperatures={temperatures} />
        {tiltInDial ? <div aria-hidden="true" /> : <TiltWidget tilt={firstTilt} compact />}
      </div>
      <VenusDial
        tanks={tanks}
        batteries={batteries}
        solar={solar}
        tilt={tilt}
        powerSources={powerSources}
        isDark={isDark}
        now={now}
      />
    </div>
  )
}

function DialOrEmpty({ slot, isDark, size }: { slot: DialSlot; isDark: boolean; size: DialSize }) {
  if (!slot.view) {
    return (
      <div
        role="status"
        className="text-muted flex aspect-square w-full max-w-[260px] flex-col items-center justify-center gap-1 text-center text-sm"
      >
        <span aria-hidden="true">{slot.icon}</span>
        <span className="font-semibold">{slot.label}</span>
        No data yet
      </div>
    )
  }
  return <Dial view={slot.view} icon={slot.icon} size={size} glow={isDark} />
}

/** A place for a widget that does not exist yet. */
function EmptySlot() {
  return (
    <div
      aria-hidden="true"
      className="border-border text-muted flex h-full min-h-0 items-center justify-center rounded-2xl border-2 border-dashed"
    >
      <Plus className="size-5" />
    </div>
  )
}
