import { RadialGauge } from '../components/RadialGauge'
import { isCompleteBattery, type Battery } from '../types'

export interface PowerTabProps {
  batteries: Record<string, Battery>
}

export function PowerTab({ batteries }: PowerTabProps) {
  // MQTT builds a battery up one property per retained message; skip any
  // id whose record hasn't fully arrived yet instead of crashing on the
  // still-missing fields (see `isCompleteBattery`).
  const ids = Object.keys(batteries)
    .filter((id) => isCompleteBattery(batteries[id]))
    .sort()

  if (ids.length === 0) {
    return <p className="empty-state">No battery data yet.</p>
  }

  return (
    <div className="tab-grid">
      {ids.map((id) => {
        const battery = batteries[id]
        const sign = battery.current_a > 0 ? '+' : ''
        return (
          <div key={id} className="power-card">
            <RadialGauge pct={battery.soc_pct} label={`Battery (${id})`} color="var(--ok)" />
            <div className="power-card__readout">
              {battery.voltage_v.toFixed(1)} V · {sign}
              {battery.current_a.toFixed(1)} A · {battery.power_w.toFixed(0)} W ·{' '}
              {battery.temperature_c.toFixed(0)}°C
            </div>
            <span className="badge badge--ok">{battery.charge_state}</span>
          </div>
        )
      })}
    </div>
  )
}
