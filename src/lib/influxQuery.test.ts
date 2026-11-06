import { describe, expect, it } from 'vite-plus/test'
import { dailyYieldQuery } from './influxQuery'

describe('dailyYieldQuery', () => {
  const query = dailyYieldQuery({ id: 'mppt-1', days: 30, timeZone: 'Europe/Madrid' })

  it('reads the solar controller yield from the renewvan bucket, one extra day back', () => {
    expect(query).toContain('from(bucket: "renewvan")')
    expect(query).toContain('range(start: -31d)')
    expect(query).toContain(
      'r._measurement == "solar" and r.id == "mppt-1" and r._field == "yield_today_wh"',
    )
  })

  it('takes each local day max (the counter resets at midnight), stamped at the day start', () => {
    expect(query).toContain('option location = timezone.location(name: "Europe/Madrid")')
    expect(query).toContain('aggregateWindow(every: 1d, fn: max, timeSrc: "_start")')
  })

  it('cannot be broken out of by a quote in the id or time zone', () => {
    const hostile = dailyYieldQuery({ id: 'a" or true or "', days: 1, timeZone: 'x"y' })
    expect(hostile).toContain('r.id == "a\\" or true or \\""')
    expect(hostile).toContain('name: "x\\"y"')
  })
})
