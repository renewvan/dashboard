import { describe, expect, it } from 'vite-plus/test'
import { deviceRows } from './devices'
import { routerDevice, routerName } from './routerDevice'
import { emptyRenewvanBusState, type DeviceInfo, type RenewvanBusState } from '@/types'

const routerInfo: DeviceInfo = {
  device: 'router',
  product: 'Teltonika RUT-360 router',
  source: 'RutOS Data to Server MQTT push feed',
  publishes: ['router'],
  version: 'v0.2.0',
}

function rowsFor(devices: RenewvanBusState['devices']) {
  return deviceRows({ ...emptyRenewvanBusState, devices })
}

describe('routerDevice', () => {
  it('finds the Device that publishes the router entity', () => {
    const rows = rowsFor({
      tank: {
        health: 'online',
        info: { ...routerInfo, device: 'tank', product: 'Tank', publishes: ['tank'] },
      },
      router: { health: 'online', info: routerInfo },
    })
    expect(routerDevice(rows)?.key).toBe('router')
  })

  it('goes by what a Device publishes, not what it is called', () => {
    const rows = rowsFor({
      uplink: { health: 'online', info: { ...routerInfo, device: 'uplink' } },
    })
    expect(routerDevice(rows)?.key).toBe('uplink')
  })

  it('is undefined when no router driver has reported, so none counts as installed', () => {
    expect(routerDevice([])).toBeUndefined()
    expect(
      routerDevice(
        rowsFor({ tank: { health: 'online', info: { ...routerInfo, publishes: ['tank'] } } }),
      ),
    ).toBeUndefined()
  })

  it('does not count a router entity with no Device behind it', () => {
    const rows = deviceRows({ ...emptyRenewvanBusState, routers: { '0': {} as never } })
    // The entity appears as a fallback row, which carries no info and so no proof of a driver.
    expect(routerDevice(rows)).toBeUndefined()
  })

  it('does not count a Device that is online but has published no info', () => {
    expect(routerDevice(rowsFor({ router: { health: 'online' } }))).toBeUndefined()
  })

  it('still finds a router Device that has gone offline, so its last-seen state can show', () => {
    expect(routerDevice(rowsFor({ router: { health: 'offline', info: routerInfo } }))?.key).toBe(
      'router',
    )
  })
})

describe('routerName', () => {
  const named = (product: string) =>
    routerDevice(rowsFor({ router: { health: 'online', info: { ...routerInfo, product } } }))

  it('is the model out of the product', () => {
    expect(routerName(named('Teltonika RUT-360 router'))).toBe('RUT-360')
    expect(routerName(named('Teltonika RUTX11 router'))).toBe('RUTX11')
    expect(routerName(named('Teltonika RUT956'))).toBe('RUT956')
  })

  it('is the whole product when it names no model, never a model it does not say', () => {
    expect(routerName(named('Generic LTE router'))).toBe('Generic LTE router')
  })

  it('is a plain Router while there is no Device', () => {
    expect(routerName(undefined)).toBe('Router')
  })
})
