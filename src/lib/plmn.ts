/**
 * PLMN (MCC+MNC) → carrier name mapping. `router.operator` is the raw
 * PLMN string off the modem (`hub/schema/router.schema.json`: "Raw PLMN
 * string; carrier-name mapping is presentation, elsewhere") — this is
 * that presentation layer, so the popover title and Settings' Operator
 * row read "O2", not "26203".
 *
 * Owned here (frontend) on purpose: the router node just reports the
 * code it sees. If the node-router ever wants to own naming, this table
 * moves there and `plmnOperatorName` becomes a pass-through — every
 * caller already renders whatever it returns.
 *
 * Conservative, well-attested entries only (central-European van
 * roaming first); an unknown code falls back to the raw string rather
 * than guessing.
 */
const PLMN_NAMES: Record<string, string> = {
  // Germany
  '26201': 'Telekom',
  '26202': 'Vodafone',
  '26203': 'O2',
  '26211': 'O2',
  // Austria
  '23201': 'A1',
  '23203': 'T-Mobile AT',
  '23205': 'Drei',
  // Switzerland
  '22801': 'Swisscom',
  '22802': 'Sunrise',
  '22803': 'Salt',
  // Italy
  '22201': 'TIM',
  '22210': 'Vodafone IT',
  '22250': 'Iliad',
  '22288': 'WindTre',
  // France
  '20801': 'Orange FR',
  '20810': 'SFR',
  '20815': 'Free',
  '20820': 'Bouygues',
  // Spain
  '21401': 'Vodafone ES',
  '21403': 'Orange ES',
  '21407': 'Movistar',
  // Netherlands
  '20404': 'Vodafone NL',
  '20408': 'KPN',
  // Belgium
  '20601': 'Proximus',
  '20610': 'Orange BE',
  '20620': 'BASE',
  // Denmark
  '23801': 'TDC',
  '23802': 'Telenor DK',
  '23820': 'Telia DK',
  // Sweden
  '24001': 'Telia SE',
  '24002': 'Tele2',
  '24008': 'Telenor SE',
  // Norway
  '24201': 'Telenor NO',
  '24202': 'Telia NO',
  // Poland
  '26001': 'Orange PL',
  '26006': 'Play',
  // Czechia
  '23001': 'T-Mobile CZ',
  '23002': 'O2 CZ',
  '23003': 'Vodafone CZ',
  // UK
  '23410': 'O2 UK',
  '23415': 'Vodafone UK',
  '23420': 'Three',
  '23430': 'EE',
}

/**
 * Carrier display name for a PLMN code, or `null` when the code is
 * missing/unknown — callers fall back to the raw code so an unmapped
 * operator still shows something truthful.
 */
export function plmnOperatorName(plmn: string | undefined): string | null {
  if (!plmn) return null
  return PLMN_NAMES[plmn] ?? null
}
