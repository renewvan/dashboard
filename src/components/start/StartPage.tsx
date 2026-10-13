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
import { CockpitDial, type DialSize } from './CockpitDial'
import { batteryDial, tankDialOf, type DialView } from './dialView'

export interface StartPageProps {
  tanks: Record<string, Partial<Tank>>
  batteries: Record<string, Partial<BatteryRecord>>
  solar: Record<string, Partial<Solar>>
  temperatures: Record<string, Partial<TemperatureSensor>>
  gps: Record<string, Partial<Gps>>
  tilt: Record<string, Partial<Tilt>>
  /** Glow behind the dial fill: dark theme only. */
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

  return (
    <div data-testid="pane-start" className="flex min-h-0 flex-1 flex-col gap-3 p-2">
      <div className="grid h-28 shrink-0 grid-cols-3 gap-2 px-3 pt-3">
        <EmptySlot />
        <WeatherWidget lat={fix?.latitude} lon={fix?.longitude} temperatures={temperatures} />
        <EmptySlot />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.5fr_1fr] items-end gap-1 p-2 pb-6">
        {slots.map((slot) => (
          <section
            key={slot.id}
            className="flex h-full min-h-0 flex-col items-center justify-end gap-2"
          >
            {slot.id === 'fresh' && (
              <div className="flex min-h-0 w-full flex-1 items-start justify-center">
                {solarWidget}
              </div>
            )}
            {slot.id === 'grey' && (
              <div className="flex min-h-0 w-full flex-1 items-start justify-center">
                <TiltWidget tilt={firstTilt} compact />
              </div>
            )}
            <DialOrEmpty slot={slot} isDark={isDark} size={slot.size} />
          </section>
        ))}
      </div>
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
  return <CockpitDial view={slot.view} icon={slot.icon} size={size} glow={isDark} />
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
