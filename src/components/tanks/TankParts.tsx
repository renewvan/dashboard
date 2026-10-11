import type { ReactNode } from 'react'
import { Button, Chip } from '@heroui/react'
import {
  ClipboardClock,
  Gauge,
  Settings,
  Thermometer,
  WavesArrowDown,
  WavesArrowUp,
} from 'lucide-react'
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
          view.rateLabel === 'Drain Rate' ? (
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

/**
 * Last refilled/emptied date and the Configure button. HeroUI's component CSS is
 * unlayered, so the border colour (`*` rule) and the button shape need `!`.
 * No tooltip: HeroUI's never opens on a disabled button or on a touch tap.
 */
export function TankFooter({ view }: { view: TankView }) {
  return (
    <div className="border-border! flex shrink-0 items-center justify-between gap-2 border-t px-5 py-2">
      <div className="flex min-w-0 items-center gap-1 text-xs">
        <ClipboardClock aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate font-semibold">{`${view.footerLabel}:`}</span>
        <span className="truncate">{view.footerDate}</span>
      </div>
      <Button
        isIconOnly
        isDisabled
        variant="outline"
        aria-label="Configure"
        className="size-11! shrink-0 rounded-full!"
      >
        <Settings aria-hidden="true" className="size-4!" />
      </Button>
    </div>
  )
}
