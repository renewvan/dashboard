import { describe, expect, it } from 'vite-plus/test'
import { emptyRenewvanBusState, type DriverInfo, type RenewvanBusState } from '@/types'
import { driverRows } from './drivers'
import { driverCounts, driverCountsText } from './hubDrivers'

const info = (driver: string): DriverInfo => ({
  driver,
  product: driver,
  source: 's',
  publishes: ['tank'],
  version: 'v1',
})

const rowsFor = (drivers: RenewvanBusState['drivers'], extra: Partial<RenewvanBusState> = {}) =>
  driverRows({ ...emptyRenewvanBusState, drivers, ...extra })

describe('driverCounts', () => {
  it('is all zero before anything has announced itself', () => {
    expect(driverCounts([])).toEqual({ online: 0, offline: 0, unknown: 0, total: 0 })
  })

  it('counts Drivers by what the bus last said about them', () => {
    const counts = driverCounts(
      rowsFor({
        tank: { health: 'online', info: info('tank') },
        venus: { health: 'online', info: info('venus') },
        router: { health: 'offline', info: info('router') },
        // Info with no health yet, and online with no info: neither up nor down.
        gps: { info: info('gps') },
        tilt: { health: 'online' },
      }),
    )
    // `tilt` is online without info, which still reads Online; `gps` has info but no health.
    expect(counts).toEqual({ online: 3, offline: 1, unknown: 1, total: 5 })
  })

  it('does not count an entity type no Driver claims, which is not a Driver', () => {
    const rows = rowsFor({}, { tanks: { fresh: {} as never } })
    expect(rows).toHaveLength(1)
    expect(driverCounts(rows).total).toBe(0)
  })
})

describe('driverCountsText', () => {
  it('says None with no Driver', () => {
    expect(driverCountsText({ online: 0, offline: 0, unknown: 0, total: 0 })).toBe('None')
  })

  it('names only the states that have a Driver in them', () => {
    expect(driverCountsText({ online: 3, offline: 0, unknown: 0, total: 3 })).toBe('3 online')
    expect(driverCountsText({ online: 2, offline: 1, unknown: 0, total: 3 })).toBe(
      '2 online · 1 offline',
    )
    expect(driverCountsText({ online: 2, offline: 1, unknown: 1, total: 4 })).toBe(
      '2 online · 1 offline · 1 unknown',
    )
  })

  it('does not lead with 0 online when everything is down', () => {
    expect(driverCountsText({ online: 0, offline: 2, unknown: 0, total: 2 })).toBe('2 offline')
  })
})
