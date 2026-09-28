import { Switch } from '@/components/ui/switch'

export interface RelayRowProps {
  label: string
  state: boolean
}

/**
 * A single read-only relay row: label + on/off indicator, built on Coss's
 * Switch primitive (`src/components/ui/switch.tsx`). No tap-to-toggle —
 * `relay` has no command topic in v0
 * (hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md) — so
 * the switch is rendered read-only, reflecting live state only.
 */
export function RelayRow({ label, state }: RelayRowProps) {
  return (
    <div
      className="flex items-center justify-between rounded-lg bg-card/50 p-3.5 backdrop-blur-md"
      data-testid="relay-row"
    >
      <span>{label}</span>
      <Switch checked={state} readOnly aria-label={label} tabIndex={-1} />
    </div>
  )
}
