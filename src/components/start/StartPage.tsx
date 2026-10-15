import type { ReactNode } from 'react'
import { Battery } from 'lucide-react'
import { FLUID_ICONS } from '@/components/tanks/fluidIcon'
import { Card } from '@heroui/react'
import { useIsMobile } from '@/hooks/use-media-query'
import { useNow } from '@/hooks/useNow'
import {
  hasGpsFix,
  isCompleteGps,
  type Battery as BatteryRecord,
  type Charger,
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
import { CockpitDial } from './cockpit/CockpitDial'
import { batteryDial, tankDialOf, type DialView } from './cockpit/dialView'
import { Dial } from './Dial'
import type { DialSize } from './DialReadout'

export interface StartPageProps {
  tanks: Record<string, Partial<Tank>>
  batteries: Record<string, Partial<BatteryRecord>>
  solar: Record<string, Partial<Solar>>
  chargers: Record<string, Partial<Charger>>
  temperatures: Record<string, Partial<TemperatureSensor>>
  gps: Record<string, Partial<Gps>>
  tilt: Record<string, Partial<Tilt>>
  /** Which tank or battery each ring shows, and how full each half-moon band reads. */
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
 * The Start page: the Dial on the kiosk, one card per widget on a phone.
 *
 * Kiosk: the Dial, edge to edge: two half-moons of power readings either side of three rings
 * (battery and tanks), with the van's tilt or the battery in the middle. A reading or ring whose
 * data has not arrived shows a dash or "No data yet", never a number. There is no widget row on the
 * kiosk: the weather has no place there and the tilt lives in the Dial.
 *
 * Phone (below 800px, the shell's breakpoint): one card per widget, stacked and scrolling; solar
 * sits at the top of the fresh water card.
 */
export function StartPage({
  tanks,
  batteries,
  solar,
  chargers,
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
    <section data-testid="pane-start" className="flex min-h-0 flex-1 flex-col px-8 pb-4">
      <Dial
        tanks={tanks}
        batteries={batteries}
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
