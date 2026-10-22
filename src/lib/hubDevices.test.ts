import { describe, expect, it } from 'vite-plus/test'
import { emptyRenewvanBusState, type DeviceInfo, type RenewvanBusState } from '@/types'
import { deviceRows } from './devices'
import { deviceCounts, deviceCountsText } from './hubDevices'

const info = (device: string): DeviceInfo => ({
  device,
  product: device,
  source: 's',
  publishes: ['tank'],
  version: 'v1',
})

const rowsFor = (devices: RenewvanBusState['devices'], extra: Partial<RenewvanBusState> = {}) =>
  deviceRows({ ...emptyRenewvanBusState, devices, ...extra })

describe('deviceCounts', () => {
  it('is all zero before anything has announced itself', () => {
    expect(deviceCounts([])).toEqual({ online: 0, offline: 0, unknown: 0, total: 0 })
  })

  it('counts Devices by what the bus last said about them', () => {
    const counts = deviceCounts(
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

  it('does not count an entity type no Device claims, which is not a Device', () => {
    const rows = rowsFor({}, { tanks: { fresh: {} as never } })
    expect(rows).toHaveLength(1)
    expect(deviceCounts(rows).total).toBe(0)
  })
})

describe('deviceCountsText', () => {
  it('says None with no Device', () => {
    expect(deviceCountsText({ online: 0, offline: 0, unknown: 0, total: 0 })).toBe('None')
  })

  it('names only the states that have a Device in them', () => {
    expect(deviceCountsText({ online: 3, offline: 0, unknown: 0, total: 3 })).toBe('3 online')
    expect(deviceCountsText({ online: 2, offline: 1, unknown: 0, total: 3 })).toBe(
      '2 online · 1 offline',
    )
    expect(deviceCountsText({ online: 2, offline: 1, unknown: 1, total: 4 })).toBe(
      '2 online · 1 offline · 1 unknown',
    )
  })

  it('does not lead with 0 online when everything is down', () => {
    expect(deviceCountsText({ online: 0, offline: 2, unknown: 0, total: 2 })).toBe('2 offline')
  })
})
