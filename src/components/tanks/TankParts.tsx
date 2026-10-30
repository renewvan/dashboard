import type { ReactNode } from 'react'
import { Chip } from '@heroui/react'
import { Gauge, Thermometer, WavesArrowDown, WavesArrowUp } from 'lucide-react'
import { CHIP_COLOR, TEXT_COLOR } from './severity'
import type { TankLabel, TankView } from './tankView'

/** One telemetry row: accent icon + muted label, bold value beneath. */
export function InfoField({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: ReactNode
  label: string
  value: string
  /** Overrides the value's text colour (the Status row's severity). */
  valueColor?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs">
        <span aria-hidden="true" className="text-accent">
          {icon}
        </span>
        <span className="text-muted">{label}</span>
      </div>
      <div className="text-sm font-semibold" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
    </div>
  )
}

/** The header badge. */
export function SeverityChip({ badge }: { badge: TankLabel }) {
  return (
    <Chip size="sm" variant="soft" color={CHIP_COLOR[badge.severity]}>
      {badge.label}
    </Chip>
  )
}

/** Status (only with an alarm configured or a fault), Temperature, and the pace. */
export function TankStats({ view }: { view: TankView }) {
  return (
    <>
      {view.status && (
        <InfoField
          icon={<Gauge className="size-4" />}
          label="Status"
          value={view.status.label}
          valueColor={TEXT_COLOR[view.status.severity]}
        />
      )}
      <InfoField
        icon={<Thermometer className="size-4" />}
        label="Temperature"
        value={view.temperature}
      />
      <InfoField
        icon={
          view.isRefill ? (
            <WavesArrowDown className="size-4" />
          ) : (
            <WavesArrowUp className="size-4" />
          )
        }
        label={view.rateLabel}
        value={view.rate}
      />
    </>
  )
}

/** Stretched over a card so the whole card opens the tank's settings. */
export function OpenTank({ view, onOpen }: { view: TankView; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${view.fluidLabel} settings`}
      onClick={onOpen}
      className="absolute inset-0 z-20 rounded-[inherit]"
    />
  )
}
