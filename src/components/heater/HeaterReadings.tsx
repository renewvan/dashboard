import type { Heater } from '@/types'

function fmt(value: number | undefined, digits: number, unit: string): string {
  return value === undefined ? '—' : `${value.toFixed(digits)} ${unit}`
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="truncate text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * The heater's sensor readings, as the children of a two-column `<dl>`. External is the probe; "—"
 * when none is fitted (the 0x7F sentinel). The heater's own internal sensor is a different reading,
 * shown separately.
 */
export function HeaterReadings({ heater, reporting }: { heater: Heater; reporting: boolean }) {
  return (
    <>
      <Readout
        label="External"
        value={reporting ? fmt(heater.external_temperature_c, 1, '°C') : '—'}
      />
      <Readout
        label="Internal"
        value={reporting ? fmt(heater.internal_temperature_c, 1, '°C') : '—'}
      />
      <Readout label="Heater" value={reporting ? fmt(heater.heater_temperature_c, 0, '°C') : '—'} />
      <Readout label="Voltage" value={reporting ? fmt(heater.voltage_v, 1, 'V') : '—'} />
      <Readout label="Fan" value={reporting ? fmt(heater.fan_rpm, 0, 'rpm') : '—'} />
      <Readout label="Fuel pump" value={reporting ? fmt(heater.fuel_pump_hz, 1, 'Hz') : '—'} />
    </>
  )
}
