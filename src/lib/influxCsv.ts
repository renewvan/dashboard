/** One sample of a query result. `value` is `null` for a window InfluxDB had no data for. */
export interface FluxPoint {
  time: Date
  value: number | null
}

/** Splits one CSV line, honouring double-quoted fields (`""` is a literal quote). */
function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      fields.push(field)
      field = ''
    } else field += ch
  }
  fields.push(field)
  return fields
}

/**
 * Parses InfluxDB's annotated CSV (`Accept: application/csv`) into `{time, value}` points. A response
 * is one table per series, each with its own header row, separated by blank lines; the `#` lines
 * are annotations. Throws the server's message when the response is an error table, so a bad query
 * is not mistaken for an empty history.
 */
export function parseFluxCsv(csv: string): FluxPoint[] {
  const points: FluxPoint[] = []
  let columns: string[] | undefined
  for (const line of csv.split(/\r?\n/)) {
    if (line === '') {
      columns = undefined
      continue
    }
    if (line.startsWith('#')) continue
    const fields = splitCsvLine(line)
    if (columns === undefined) {
      columns = fields
      continue
    }
    const errorAt = columns.indexOf('error')
    if (errorAt !== -1 && columns.includes('reference')) {
      throw new Error(fields[errorAt] ?? 'InfluxDB query failed')
    }
    const time = fields[columns.indexOf('_time')]
    const value = fields[columns.indexOf('_value')]
    if (!time) continue
    const number = value === undefined || value === '' ? Number.NaN : Number(value)
    points.push({ time: new Date(time), value: Number.isFinite(number) ? number : null })
  }
  return points
}
