import { createElement } from 'react'
import { Battery } from 'lucide-react'
import { FLUID_ICONS } from '@/components/tanks/fluidIcon'
import { TiltWidget } from '@/components/widgets/tilt/TiltWidget'
import { firstSolar } from '@/components/widgets/solar/solarView'
import type { RingSource, RingUnit, StartPowerSources } from '@/hooks/useStartPowerSources'
import { charging } from '@/lib/charging'
import { INDOOR_ID, OUTDOOR_ID } from '@/lib/temperature'
import {
  isCompleteBattery,
  type Battery as BatteryRecord,
  type Charger,
  type Solar,
  type Tank,
  type Tilt,
  type TemperatureSensor,
} from '@/types'
import { DialReadout } from './DialReadout'
import { DialTemperature } from './DialTemperature'
import { batteryDial, tankDialOf, type DialView } from './cockpit/dialView'
import { HalfMoon } from './HalfMoon'
import { Rings, type RingModel } from './Rings'
import { centreKind, chargingReading, legendIndices, powerReading, ringLabel } from './dialModel'

export interface DialProps {
  tanks: Record<string, Partial<Tank>>
  batteries: Record<string, Partial<BatteryRecord>>
  solar: Record<string, Partial<Solar>>
  chargers: Record<string, Partial<Charger>>
  tilt: Record<string, Partial<Tilt>>
  /** Probes by id; `outdoor` and `indoor` (lib/temperature.ts) are shown above the half-moons. */
  temperatures: Record<string, Partial<TemperatureSensor>>
  powerSources: StartPowerSources
  /** Glow behind the ring fill: dark theme only. */
  isDark: boolean
  now: Date
}

/** Colour while a ring has no data: not a severity, so the band just stays dim. */
const NO_DATA_COLOR = 'currentColor'

function ringModel(source: RingSource, view: DialView | undefined, unit: RingUnit): RingModel {
  const icon =
    source === 'battery' ? (
      <Battery className="size-4" />
    ) : (
      createElement(FLUID_ICONS[source], { className: 'size-4' })
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
  }
}

/**
 * The Start page's kiosk cockpit: a half-moon of two incoming power readings on the left, three
 * concentric rings (each the battery or a kind of tank, as configured) in the middle, and a
 * half-moon of the outgoing power on the right. The middle of the rings shows the van's tilt while
 * it has a usable reading and the battery otherwise. The outdoor temperature floats above the left
 * half-moon and the indoor one above the right.
 */
export function Dial({
  tanks,
  batteries,
  solar,
  chargers,
  tilt,
  temperatures,
  powerSources,
  isDark,
  now,
}: DialProps) {
  const battery = Object.values(batteries).find(isCompleteBattery)
  const solarW = firstSolar(solar)?.power_w
  const batteryW = battery?.power_w
  const present = charging(chargers)

  const batteryView = batteryDial(batteries)
  const rings = powerSources.rings.map((source) =>
    ringModel(
      source,
      source === 'battery' ? batteryView : tankDialOf(tanks, source, now),
      powerSources.ringUnit,
    ),
  )

  const firstTilt = Object.values(tilt)[0]
  const centre = centreKind(firstTilt)

  return (
    // `px-4` is the header's own padding, so the half-moons' outer edges line up with the logo on the
    // left and the header buttons on the right.
    <div data-testid="start-dial" className="flex min-h-0 flex-1 items-center justify-center px-8">
      <div className="grid min-h-0 w-full grid-cols-[1fr_1.8fr_1fr] items-center pb-4">
        <div className="relative">
          <DialTemperature kind="outdoor" sensor={temperatures[OUTDOOR_ID]} side="left" />
          <HalfMoon
            side="left"
            readings={[
              powerReading(powerSources.leftTop, solarW, batteryW),
              ...(present ? [chargingReading(powerSources.leftBottom, present)] : []),
            ]}
          />
        </div>
        <div className="flex justify-center">
          <Rings
            rings={rings}
            legend={legendIndices(powerSources.rings, centre)}
            glow={isDark}
            centre={
              centre === 'tilt' ? (
                <TiltWidget tilt={firstTilt} compact />
              ) : batteryView ? (
                <div className="flex flex-col items-center" aria-hidden="true">
                  <DialReadout
                    view={batteryView}
                    icon={<Battery className="size-4" />}
                    size="focus"
                  />
                </div>
              ) : (
                <div role="status" className="text-muted text-sm">
                  No data yet
                </div>
              )
            }
          />
        </div>
        <div className="relative">
          <DialTemperature kind="indoor" sensor={temperatures[INDOOR_ID]} side="right" />
          <HalfMoon side="right" readings={[powerReading(powerSources.right, solarW, batteryW)]} />
        </div>
      </div>
    </div>
  )
}
