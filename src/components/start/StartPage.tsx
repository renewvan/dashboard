import { lazy, Suspense } from 'react'
import { Battery, CloudSun, Move3d, Sun, Zap } from 'lucide-react'
import { FLUID_ICONS } from '@/components/tanks/fluidIcon'
import { TankRow } from '@/components/tanks/TankRow'
import { Card } from '@heroui/react'
import { PhoneCard } from '@/components/PhoneCard'
import { useIsMobile } from '@/hooks/use-media-query'
import { useNow } from '@/hooks/useNow'
import {
  hasGpsFix,
  isCompleteGps,
  isCompleteTank,
  type Battery as BatteryRecord,
  type Charger,
  type Gps,
  type Solar,
  type Tank,
  type TemperatureSensor,
  type Tilt,
} from '@/types'
import { flowFromBus } from '@/components/power/flowModel'
import { WeatherWidget } from '@/components/widgets/weather/WeatherWidget'
import { TiltWidget } from '@/components/widgets/tilt/TiltWidget'
import { firstSolar } from '@/components/widgets/solar/solarView'
import type { PowerLayout } from '@/hooks/usePowerLayout'
import type { StartPowerSources } from '@/hooks/useStartPowerSources'
import { CockpitDial } from './cockpit/CockpitDial'
import { batteryDial } from './cockpit/dialView'
import { Carousel } from './Carousel'
import { Dial } from './Dial'
import { NoData } from './NoData'
import { PowerCard } from './PowerCard'
import { SolarCard } from './SolarCard'

// MapLibre is most of the bundle, so the map card loads with its own chunk, as the Map page does.
const MapPage = lazy(() => import('@/components/map/MapPage').then((m) => ({ default: m.MapPage })))

/** The map card's height: at least the Battery card's (its dial is up to 300px wide and square-ish, plus its title row). */
const MAP_CARD_HEIGHT = 'h-[360px]'

export interface StartPageProps {
  tanks: Record<string, Partial<Tank>>
  batteries: Record<string, Partial<BatteryRecord>>
  /** The shared Primary battery choice, `auto` or an instance id (`primaryBattery`). */
  primaryBatterySelection?: string
  solar: Record<string, Partial<Solar>>
  chargers: Record<string, Partial<Charger>>
  temperatures: Record<string, Partial<TemperatureSensor>>
  gps: Record<string, Partial<Gps>>
  tilt: Record<string, Partial<Tilt>>
  /** Which tank or battery each ring shows, and how full each half-moon band reads. */
  powerSources: StartPowerSources
  /** The Power page's layout choice; the phone's Power card draws the same one. */
  powerLayout: PowerLayout
  /** Glow behind the ring fill: dark theme only. */
  isDark: boolean
  /** Whether the phone's map card draws the dark map: the Map page's choice, which can differ from the app theme. */
  mapIsDark: boolean
  /** A tank card's Configure button (phone): opens that tank's settings. */
  onConfigureTank: (id: string) => void
}

/** Tank levels move slowly; minute resolution is plenty for the severity colour. */
const REFRESH_MS = 30_000

/** The tanks the phone's Start page shows, in order; the van publishes fresh and grey only. */
const PHONE_TANKS = [
  { fluid: 'fresh_water', label: 'Fresh water' },
  { fluid: 'grey_water', label: 'Grey water' },
] as const

/** The first complete tank of a fluid type, with its bus id; ids are arbitrary, the fluid is the ask. */
function tankOf(tanks: Record<string, Partial<Tank>>, fluid: Tank['fluid_type']) {
  for (const [id, tank] of Object.entries(tanks)) {
    if (isCompleteTank(tank) && tank.fluid_type === fluid) return { id, tank }
  }
  return undefined
}

/**
 * The Start page: the Dial on the kiosk, one card per reading on a phone.
 *
 * Kiosk: the Dial, edge to edge: two half-moons of power readings either side of three rings
 * (battery and tanks), with the van's tilt or the battery in the middle. A reading or ring whose
 * data has not arrived shows a dash or "No data yet", never a number. There is no widget row on the
 * kiosk: the weather has no place there and the tilt lives in the Dial.
 *
 * Phone (below 800px, the shell's breakpoint): everything is a card, stacked and scrolling: weather,
 * map, a power carousel (the power flow, then the battery's cockpit dial), tilt, then fresh and grey water as the Tanks page's own phone cards.
 * The cockpit dial is the battery's alone here.
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
}: StartPageProps) {
  const isMobile = useIsMobile()
  const now = new Date(useNow(REFRESH_MS))

  if (isMobile) {
    // The first GPS record with a plottable position; the weather is looked up there.
    const fix = Object.values(gps).find((g): g is Gps => isCompleteGps(g) && hasGpsFix(g))
    // One tilt device per van; show the first record.
    const firstTilt = Object.values(tilt)[0]
    const battery = batteryDial(batteries, primaryBatterySelection)
    const flow = flowFromBus(batteries, solar, chargers, primaryBatterySelection)
    // One solar controller per van is the common case; show the first complete record.
    const firstSolarRecord = firstSolar(solar)
    const tankRows = PHONE_TANKS.map(({ fluid, label }) => ({
      fluid,
      label,
      Icon: FLUID_ICONS[fluid],
      found: tankOf(tanks, fluid),
    }))

    return (
      <div
        data-testid="pane-start"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-4 pt-3 pb-4"
      >
        <PhoneCard title="Weather" icon={<CloudSun className="size-4" />}>
          <div className="h-30 w-full">
            <WeatherWidget lat={fix?.latitude} lon={fix?.longitude} temperatures={temperatures} />
          </div>
        </PhoneCard>
        {/* Edge to edge: no title row, no padding. The map is the card. */}
        <Card className={`${MAP_CARD_HEIGHT} shrink-0 overflow-hidden p-0!`}>
          <Suspense
            fallback={
              <div
                data-testid="map-card-loading"
                aria-busy="true"
                className="text-muted flex size-full items-center justify-center text-sm"
              >
                Loading map…
              </div>
            }
          >
            <MapPage
              variant="card"
              gps={gps as Record<string, Gps>}
              tilt={tilt}
              isDark={mapIsDark}
            />
          </Suspense>
        </Card>
        <PhoneCard title="Energy" icon={<Zap className="size-4" />}>
          <Carousel
            label="Energy"
            slides={[
              {
                id: 'flow',
                label: 'Power flow',
                content: <PowerCard flow={flow} layout={powerLayout} />,
              },
              {
                id: 'battery',
                label: 'Battery',
                content: battery ? (
                  <CockpitDial
                    view={battery}
                    icon={<Battery className="size-4" />}
                    size="focus"
                    glow={isDark}
                    pulse={battery.charging}
                    aligned={false}
                    className="mt-3 -mb-[12%] max-w-[300px]"
                  />
                ) : (
                  <NoData icon={<Battery className="size-4" />} label="Battery" />
                ),
              },
            ]}
          />
        </PhoneCard>
        {firstSolarRecord && (
          <PhoneCard title="Solar" icon={<Sun className="size-4" />}>
            <SolarCard solar={firstSolarRecord} />
          </PhoneCard>
        )}
        <PhoneCard title="Tilt" icon={<Move3d className="size-4" />}>
          <div className="h-28 w-full">
            <TiltWidget tilt={firstTilt} />
          </div>
        </PhoneCard>
        {tankRows.map(({ fluid, label, Icon, found }) =>
          found ? (
            <TankRow
              key={fluid}
              id={found.id}
              tank={found.tank}
              now={now}
              onConfigure={onConfigureTank}
            />
          ) : (
            <PhoneCard key={fluid} title={label} icon={<Icon className="size-4" />}>
              <NoData label={label} icon={<Icon className="size-4" />} />
            </PhoneCard>
          ),
        )}
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
