import './RelayRow.css'

export interface RelayRowProps {
  label: string
  state: boolean
}

/**
 * A single read-only relay row: label + on/off indicator. No tap-to-toggle
 * — `relay` has no command topic in v0
 * (hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md).
 */
export function RelayRow({ label, state }: RelayRowProps) {
  return (
    <div className="relay-row" data-testid="relay-row">
      <span>{label}</span>
      <span
        className={`relay-row__indicator${state ? ' relay-row__indicator--on' : ''}`}
        role="status"
        aria-label={state ? 'on' : 'off'}
      />
    </div>
  )
}
