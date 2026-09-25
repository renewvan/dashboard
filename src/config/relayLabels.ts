// Dashboard-side `id -> human label` mapping for relay rows. `relay` has no
// label field on the wire (schema/relay.schema.json is `{ state: bool }`
// only) — the label is presentation-only, per
// hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md.
//
// Override via VITE_RELAY_LABELS, a JSON object of `id -> label`. Any id
// published on the bus without an entry falls back to its raw id so a new
// relay always renders something instead of disappearing.

const defaultLabels: Record<string, string> = {
  lights_ceiling: 'Ceiling lights',
  lights_awning: 'Awning lights',
  water_pump: 'Water pump',
  fan: 'Roof fan',
  lights_reading: 'Reading lights',
  fridge_fan: 'Fridge fan',
  usb_outlets: 'USB outlets',
  aux: 'Aux',
}

function parseOverrides(raw: string | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    // Malformed override: fall through to defaults rather than crash the
    // dashboard over a config typo.
  }
  return {}
}

export const relayLabels: Record<string, string> = {
  ...defaultLabels,
  ...parseOverrides(import.meta.env.VITE_RELAY_LABELS as string | undefined),
}

export function relayLabel(id: string): string {
  return relayLabels[id] ?? id
}
