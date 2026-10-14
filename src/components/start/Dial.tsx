import { createElement } from 'react'
import { Battery } from 'lucide-react'
import { FLUID_ICONS } from '@/components/tanks/fluidIcon'
import { TiltWidget } from '@/components/widgets/tilt/TiltWidget'
import { firstSolar } from '@/components/widgets/solar/solarView'
import type { RingSource, StartPowerSources } from '@/hooks/useStartPowerSources'
import {
  isCompleteBattery,
  type Battery as BatteryRecord,
  type Solar,
  type Tank,
  type Tilt,
} from '@/types'
import { DialReadout } from './DialReadout'
import { batteryDial, tankDialOf, type DialView } from './cockpit/dialView'
import { HalfMoon } from './HalfMoon'
import { Rings, type RingModel } from './Rings'
import { centreKind, legendIndices, powerReading, ringLabel } from './dialModel'

export interface DialProps {
  tanks: Record<string, Partial<Tank>>
  batteries: Record<string, Partial<BatteryRecord>>
  solar: Record<string, Partial<Solar>>
  tilt: Record<string, Partial<Tilt>>
  powerSources: StartPowerSources
  /** Glow behind the ring fill: dark theme only. */
  isDark: boolean
  now: Date
}

/** Colour while a ring has no data: not a severity, so the band just stays dim. */
const NO_DATA_COLOR = 'currentColor'

function ringModel(source: RingSource, view: DialView | undefined): RingModel {
  const icon =
    source === 'battery' ? (
      <Battery className="size-4" />
    ) : (
      createElement(FLUID_ICONS[source], { className: 'size-4' })
    )
  return {
    label: ringLabel(source),
    icon,
    pct: view?.pct ?? 0,
    color: view?.color ?? NO_DATA_COLOR,
    hasData: view !== undefined,
  }
}

/**
 * The Start page's kiosk cockpit: a half-moon of two incoming power readings on the left, three
 * concentric rings (each the battery or a kind of tank, as configured) in the middle, and a
 * half-moon of the outgoing power on the right. The middle of the rings shows the van's tilt while
 * it has a usable reading and the battery otherwise.
 */
export function Dial({ tanks, batteries, solar, tilt, powerSources, isDark, now }: DialProps) {
  const battery = Object.values(batteries).find(isCompleteBattery)
  const solarW = firstSolar(solar)?.power_w
  const batteryW = battery?.power_w

  const batteryView = batteryDial(batteries)
  const rings = powerSources.rings.map((source) =>
    ringModel(source, source === 'battery' ? batteryView : tankDialOf(tanks, source, now)),
  )

  const firstTilt = Object.values(tilt)[0]
  const centre = centreKind(firstTilt)

  return (
    // `px-4` is the header's own padding, so the half-moons' outer edges line up with the logo on the
    // left and the header buttons on the right.
    <div data-testid="start-dial" className="flex min-h-0 flex-1 items-center justify-center px-8">
      <div className="grid min-h-0 w-full grid-cols-[1fr_1.8fr_1fr] items-center pb-5">
        <HalfMoon
          side="left"
          readings={[
            powerReading(powerSources.leftTop, solarW, batteryW),
            powerReading(powerSources.leftBottom, solarW, batteryW),
          ]}
        />
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
        <HalfMoon side="right" readings={[powerReading(powerSources.right, solarW, batteryW)]} />
      </div>
    </div>
  )
}
