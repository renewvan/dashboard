import { describe, expect, it } from 'vite-plus/test'
import { dailyYieldQuery } from './influxQuery'

describe('dailyYieldQuery', () => {
  const query = dailyYieldQuery({ id: 'mppt-1', days: 30 })

  it('reads the solar controller yield from the renewvan bucket, one extra day back', () => {
    expect(query).toContain('from(bucket: "renewvan")')
    expect(query).toContain('range(start: -31d)')
    expect(query).toContain(
      'r._measurement == "solar" and r.id == "mppt-1" and r._field == "yield_today_wh"',
    )
  })

  it('takes the hourly max, stamped at the hour start, leaving the days to the browser', () => {
    expect(query).toContain(
      'aggregateWindow(every: 1h, fn: max, createEmpty: false, timeSrc: "_start")',
    )
  })

  it('does not import the timezone package, which costs InfluxDB seconds per query', () => {
    expect(query).not.toContain('timezone')
  })

  it('cannot be broken out of by a quote in the id', () => {
    expect(dailyYieldQuery({ id: 'a" or true or "', days: 1 })).toContain(
      'r.id == "a\\" or true or \\""',
    )
  })
})
