import './RadialGauge.css'

export interface RadialGaugeProps {
  /** 0-100. Values outside this range are clamped for the ring's sweep. */
  pct: number
  label: string
  sub?: string
  color?: string
}

/**
 * Large radial gauge for a percentage value (`tank.level_pct`,
 * `battery.soc_pct`), per the winning `prototype/dashboard-06` variant C
 * layout. Pure presentational component — props in, markup out.
 */
export function RadialGauge({ pct, label, sub, color = 'var(--kiosk-accent)' }: RadialGaugeProps) {
  const clamped = Math.min(100, Math.max(0, pct))
  const ringStyle = { background: `conic-gradient(${color} ${clamped * 3.6}deg, var(--panel-2) 0deg)` }

  return (
    <div className="radial-gauge" data-testid="radial-gauge">
      <div className="radial-gauge__ring" style={ringStyle}>
        <div className="radial-gauge__hole">
          <span className="radial-gauge__value">{Math.round(clamped)}%</span>
        </div>
      </div>
      <div className="radial-gauge__label">{label}</div>
      {sub && <div className="radial-gauge__sub">{sub}</div>}
    </div>
  )
}
