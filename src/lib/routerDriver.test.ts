import { describe, expect, it } from 'vite-plus/test'
import { driverRows } from './drivers'
import { routerDriver, routerName } from './routerDriver'
import { emptyRenewvanBusState, type DriverInfo, type RenewvanBusState } from '@/types'

const routerInfo: DriverInfo = {
  driver: 'router',
  product: 'Teltonika RUT-360 router',
  source: 'RutOS Data to Server MQTT push feed',
  publishes: ['router'],
  version: 'v0.2.0',
}

function rowsFor(drivers: RenewvanBusState['drivers']) {
  return driverRows({ ...emptyRenewvanBusState, drivers })
}

describe('routerDriver', () => {
  it('finds the Driver that publishes the router entity', () => {
    const rows = rowsFor({
      tank: {
        health: 'online',
        info: { ...routerInfo, driver: 'tank', product: 'Tank', publishes: ['tank'] },
      },
      router: { health: 'online', info: routerInfo },
    })
    expect(routerDriver(rows)?.key).toBe('router')
  })

  it('goes by what a Driver publishes, not what it is called', () => {
    const rows = rowsFor({
      uplink: { health: 'online', info: { ...routerInfo, driver: 'uplink' } },
    })
    expect(routerDriver(rows)?.key).toBe('uplink')
  })

  it('is undefined when no router driver has reported, so none counts as installed', () => {
    expect(routerDriver([])).toBeUndefined()
    expect(
      routerDriver(
        rowsFor({ tank: { health: 'online', info: { ...routerInfo, publishes: ['tank'] } } }),
      ),
    ).toBeUndefined()
  })

  it('does not count a router entity with no Driver behind it', () => {
    const rows = driverRows({ ...emptyRenewvanBusState, routers: { '0': {} as never } })
    // The entity appears as a fallback row, which carries no info and so no proof of a driver.
    expect(routerDriver(rows)).toBeUndefined()
  })

  it('does not count a Driver that is online but has published no info', () => {
    expect(routerDriver(rowsFor({ router: { health: 'online' } }))).toBeUndefined()
  })

  it('still finds a router Driver that has gone offline, so its last-seen state can show', () => {
    expect(routerDriver(rowsFor({ router: { health: 'offline', info: routerInfo } }))?.key).toBe(
      'router',
    )
  })
})

describe('routerName', () => {
  const named = (product: string) =>
    routerDriver(rowsFor({ router: { health: 'online', info: { ...routerInfo, product } } }))

  it('is the model out of the product', () => {
    expect(routerName(named('Teltonika RUT-360 router'))).toBe('RUT-360')
    expect(routerName(named('Teltonika RUTX11 router'))).toBe('RUTX11')
    expect(routerName(named('Teltonika RUT956'))).toBe('RUT956')
  })

  it('is the whole product when it names no model, never a model it does not say', () => {
    expect(routerName(named('Generic LTE router'))).toBe('Generic LTE router')
  })

  it('is a plain Router while there is no Driver', () => {
    expect(routerName(undefined)).toBe('Router')
  })
})
