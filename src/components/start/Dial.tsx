import { createElement, useState, type CSSProperties } from 'react'
import {
  Battery as BatteryEmpty,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  CarBattery,
  TriangleAlert,
} from 'lucide-react'
import { useEntityIcons } from '@/hooks/useEntityIcon'
import { entityIcon, iconKey } from '@/lib/entityIcons'
import { FLUID_ICONS } from '@/components/tanks/fluidIcon'
import { TiltWidget } from '@/components/widgets/tilt/TiltWidget'
import { firstSolar } from '@/components/widgets/solar/solarView'
import type {
  LiveWatts,
  RingSource,
  RingUnit,
  StartPowerSources,
} from '@/hooks/useStartPowerSources'
import {
  flowFromBus,
  IDLE_W,
  inputWatts,
  pulseClock,
  pulsePass,
  type PowerSnapshot,
} from '@/components/power/flowModel'
import { VanArt } from '@/components/power/VanArt'
import { charging } from '@/lib/charging'
import { primaryBattery } from '@/lib/primaryBattery'
import {
  type Battery as BatteryRecord,
  type Charger,
  type Solar,
  type Tank,
  type Tilt,
  type TemperatureSensor,
} from '@/types'
import { DialReadout, DialState } from './DialReadout'
import { DialTemperature } from './DialTemperature'
import {
  batteryDial,
  batteryLevel,
  tankDialOf,
  tankIdOf,
  type BatteryLevel,
  type DialView,
} from './cockpit/dialView'
import { HalfMoon } from './HalfMoon'
import { Rings, type RingModel } from './Rings'
import {
  centreKind,
  chargingReading,
  hasTiltReading,
  legendIndices,
  nextCentre,
  powerReading,
  ringLabel,
  type CentreKind,
} from './dialModel'

export interface DialProps {
  tanks: Record<string, Partial<Tank>>
  batteries: Record<string, Partial<BatteryRecord>>
  /** The shared Primary battery choice, `auto` or an instance id (`primaryBattery`). */
  primaryBatterySelection?: string
  solar: Record<string, Partial<Solar>>
  chargers: Record<string, Partial<Charger>>
  tilt: Record<string, Partial<Tilt>>
  /** Probes by id; the two `powerSources.temperatures` picks are shown above the half-moons. */
  temperatures: Record<string, Partial<TemperatureSensor>>
  powerSources: StartPowerSources
  /** Glow behind the ring fill: dark theme only. */
  isDark: boolean
  now: Date
  /** Opens a device in Settings by its `instanceKey`; the BMS alert opens the Primary battery with it. */
  onOpenInstance?: (key: string) => void
}

/** The battery's state icon, by how full the ring reads (`batteryLevel`). */
const LEVEL_ICONS: Record<BatteryLevel, typeof BatteryFull> = {
  full: BatteryFull,
  medium: BatteryMedium,
  low: BatteryLow,
  empty: BatteryEmpty,
}

/** Colour while a ring has no data: not a severity, so the band just stays dim. */
const NO_DATA_COLOR = 'currentColor'

function ringModel(
  source: RingSource,
  view: DialView | undefined,
  unit: RingUnit,
  /** The icon picked for the ring's tank in Settings, when there is one. */
  iconName: string | undefined,
): RingModel {
  const icon =
    source === 'battery' ? (
      <CarBattery className="size-4" />
    ) : (
      createElement(entityIcon(iconName) ?? FLUID_ICONS[source], {
        className: 'size-4',
      })
    )
  // Only a tank has litres; the battery has no volume and always reads as a percentage.
  const litres = unit === 'litres' ? view?.litres : undefined
  return {
    label: ringLabel(source),
    icon,
    pct: view?.pct ?? 0,
    value: litres ?? Math.round(view?.pct ?? 0),
    unit: litres === undefined ? '%' : '\u2113',
    color: view?.color ?? NO_DATA_COLOR,
    hasData: view !== undefined,
    pulse: view?.charging,
  }
}

/**
 * The BMS alert on the dial: an icon-only indicator (the names are in its accessible label, and on
 * the Primary battery's device page it opens) in the severity colour, shown while the Primary
 * battery has an active protection. A button when the dial can open a device, a plain status
 * otherwise. The 44px floor is for gloved use (docs/design-principles.md).
 */
function DialBmsAlert({
  flow,
  onOpenInstance,
}: {
  flow: PowerSnapshot
  onOpenInstance: ((key: string) => void) | undefined
}) {
  const { bmsAlert } = flow
  if (bmsAlert === undefined) return null
  const key = flow.nodes.battery.instance
  const props = {
    'aria-label': `Battery protection active: ${bmsAlert.names.join(', ')}`,
    'data-tone': bmsAlert.tone,
    className: `absolute top-0 left-1/2 z-10 flex min-h-11 min-w-11 -translate-x-1/2 items-center justify-center rounded-full ${
      bmsAlert.tone === 'danger' ? 'text-danger' : 'text-warning'
    }`,
  }
  const icon = <TriangleAlert aria-hidden="true" className="size-6" />
  if (onOpenInstance === undefined || key === undefined) {
    return (
      <span role="status" {...props}>
        {icon}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpenInstance(key)}
      {...props}
      className={`${props.className} focus-visible:ring-accent outline-none focus-visible:ring-4 active:brightness-90`}
    >
      {icon}
    </button>
  )
}

/**
 * The Start page's kiosk cockpit: a half-moon of two incoming power readings on the left, three
 * concentric rings (each the battery or a kind of tank, as configured) in the middle, and a
 * half-moon of the outgoing power on the right. The middle of the rings is the van drawn as the
 * battery gauge when that is chosen; otherwise it shows the van's tilt while it has a usable
 * reading and the battery otherwise. A temperature probe (the outdoor one by default)
 * floats above the left half-moon and another (the indoor one) above the right.
 */
export function Dial({
  tanks,
  batteries,
  primaryBatterySelection,
  solar,
  chargers,
  tilt,
  temperatures,
  powerSources,
  isDark,
  now,
  onOpenInstance,
}: DialProps) {
  const present = charging(chargers, IDLE_W)

  const batteryView = batteryDial(batteries, primaryBatterySelection)
  const firstTilt = Object.values(tilt)[0]
  // A tap on the middle steps through the widgets (van, tilt, battery); the Settings choice is where it starts.
  const [tapped, setTapped] = useState<CentreKind>()
  const tiltUsable = hasTiltReading(firstTilt)
  const centre =
    tapped === undefined || (tapped === 'tilt' && !tiltUsable)
      ? centreKind(powerSources.centre, firstTilt)
      : tapped

  // The battery ring's band and the van's glow are one charging effect, so they share a pass and a
  // beat, and with the van in the middle one trigger: power coming in, as the van's always been.
  // (The ring alone follows the battery's net power, as it does on the mobile cards.)
  const flow = flowFromBus(batteries, solar, chargers, primaryBatterySelection)
  const inputW = inputWatts(flow)
  // The same three readings the Power page draws: its Loads are everything coming in less what the
  // battery absorbed, so a battery that is still charging does not hide a load the sun is covering.
  const live: LiveWatts = {
    solarW: firstSolar(solar)?.power_w,
    batteryW: primaryBattery(batteries, primaryBatterySelection)?.battery.power_w,
    loadW: flow.nodes.loads.watts,
  }
  const passS = pulsePass(inputW, flow.peakW)
  // The beat is sampled once per pass: a re-render does not move it, and a new pass starts a new one.
  const icons = useEntityIcons()
  const [clock, setClock] = useState(() => pulseClock(passS))
  if (clock.passS !== passS) setClock(pulseClock(passS))

  const rings = powerSources.rings.map((source) => {
    const ring = ringModel(
      source,
      source === 'battery' ? batteryView : tankDialOf(tanks, source, now),
      powerSources.ringUnit,
      source === 'battery' ? undefined : icons[iconKey('tank', tankIdOf(tanks, source) ?? '')],
    )
    if (source !== 'battery') return ring
    return centre === 'van' ? { ...ring, pulse: inputW > IDLE_W } : ring
  })

  return (
    // A size container, so the rings can cap their own size at the height left (`100cqh`): on a short
    // landscape screen (a phone at 915×412) they would otherwise overflow the page.
    <div
      data-testid="start-dial"
      className="[container-type:size] relative flex min-h-0 flex-1 items-center justify-center pb-2 [@media(max-height:560px)]:pt-6"
    >
      <DialBmsAlert flow={flow} onOpenInstance={onOpenInstance} />
      <div className="grid min-h-0 w-full grid-cols-[1fr_1.8fr_1fr] items-center">
        <div className="relative">
          <DialTemperature
            sensorId={powerSources.temperatures.left}
            sensor={temperatures[powerSources.temperatures.left]}
            side="left"
          />
          <HalfMoon
            side="left"
            readings={[
              powerReading(powerSources.leftTop, live),
              ...(present ? [chargingReading(powerSources.leftBottom, present)] : []),
            ]}
          />
        </div>
        <div className="mb-2 flex justify-center">
          <Rings
            rings={rings}
            legend={legendIndices(powerSources.rings, centre)}
            legendNote={
              centre === 'battery' && batteryView ? (
                <DialState
                  view={batteryView}
                  icon={createElement(LEVEL_ICONS[batteryLevel(batteryView.pct)])}
                  className="tracking-wider uppercase tabular-nums"
                />
              ) : undefined
            }
            glow={isDark}
            pulseClock={clock}
            centred={centre === 'battery'}
            centre={
              <button
                type="button"
                data-testid="dial-centre-toggle"
                aria-label="Change centre widget"
                onClick={() => setTapped(nextCentre(centre, tiltUsable))}
                className="focus-visible:ring-accent flex size-full flex-col items-center justify-center rounded-full outline-none focus-visible:ring-4"
              >
                {centre === 'van' ? (
                  <VanArt flow={flow} clock={clock} className="mb-8 w-3/4" />
                ) : centre === 'tilt' ? (
                  <TiltWidget tilt={firstTilt} compact />
                ) : batteryView ? (
                  <div
                    className="gap-0.1 mt-1 flex flex-col items-center"
                    style={{ '--u': 'clamp(0.9px, 0.3cqw, 1px)' } as CSSProperties}
                    aria-hidden="true"
                  >
                    <DialReadout
                      view={batteryView}
                      icon={<CarBattery className="size-4" />}
                      size="focus"
                      hideState
                    />
                  </div>
                ) : (
                  <div role="status" className="text-muted text-sm">
                    No data yet
                  </div>
                )}
              </button>
            }
          />
        </div>
        <div className="relative">
          <DialTemperature
            sensorId={powerSources.temperatures.right}
            sensor={temperatures[powerSources.temperatures.right]}
            side="right"
          />
          <HalfMoon side="right" readings={[powerReading(powerSources.right, live)]} />
        </div>
      </div>
    </div>
  )
}
