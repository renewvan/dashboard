import { describe, expect, it } from 'vite-plus/test'
import { emptyRenewvanBusState, type DriverInfo, type RenewvanBusState } from '@/types'
import {
  driverRows,
  driversSummary,
  relayDriversOnline,
  tiltDriversOffline,
  type DriverRow,
} from './drivers'

function stateWith(partial: Partial<RenewvanBusState>): RenewvanBusState {
  return { ...emptyRenewvanBusState, ...partial }
}

const tankInfo: DriverInfo = {
  driver: 'tank',
  product: 'Tank driver',
  source: 'ADS1115 (I2C)',
  publishes: ['tank'],
  version: 'v0.8.0',
}

describe('driverRows', () => {
  it('is empty before anything has published', () => {
    expect(driverRows(emptyRenewvanBusState)).toEqual([])
  })

  it('makes one row per Driver, however many entity types it publishes', () => {
    const rows = driverRows(
      stateWith({
        drivers: {
          venus: {
            health: 'online',
            info: {
              driver: 'venus',
              product: 'Venus OS bridge',
              source: 'Venus OS MQTT',
              publishes: ['battery', 'solar', 'charger'],
              version: 'v0.3.0',
            },
          },
        },
        batteries: { '288': {} as never },
        solar: { '289': {} as never },
        chargers: { '290': {} as never, '291': {} as never },
      }),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      key: 'venus',
      name: 'Venus',
      version: 'v0.3.0',
      entityCount: 4,
    })
  })

  it('joins entities to a Driver by the entity types it publishes', () => {
    const row = driverRows(
      stateWith({
        drivers: { tank: { info: tankInfo, health: 'online' } },
        tanks: { fresh: {} as never, grey: {} as never },
        gps: { '0': {} as never },
      }),
    ).find((r) => r.key === 'tank')
    expect(row).toMatchObject({ key: 'tank', entityCount: 2 })
  })

  describe('which Driver an instance belongs to', () => {
    const batteryInfo = (driver: string): DriverInfo => ({
      driver,
      product: `${driver} bridge`,
      source: driver,
      publishes: ['battery'],
      version: 'v0.1.0',
    })
    const idsOf = (rows: DriverRow[], key: string) =>
      rows.find((r) => r.key === key)?.entities.flatMap((e) => e.ids)

    it('gives each of two Drivers publishing one type only the instances that name it', () => {
      const rows = driverRows(
        stateWith({
          drivers: {
            venus: { info: batteryInfo('venus'), health: 'online' },
            wattcycle: { info: batteryInfo('wattcycle'), health: 'online' },
          },
          batteries: {
            '512': { driver: 'venus' } as never,
            '513': { driver: 'venus' } as never,
            wattcycle: { driver: 'wattcycle' } as never,
          },
        }),
      )
      expect(idsOf(rows, 'venus')).toEqual(['512', '513'])
      expect(idsOf(rows, 'wattcycle')).toEqual(['wattcycle'])
      expect(rows.find((r) => r.key === 'venus')?.entityCount).toBe(2)
      expect(rows.find((r) => r.key === 'wattcycle')?.entityCount).toBe(1)
      expect(rows.some((r) => r.key.startsWith('domain:'))).toBe(false)
    })

    it('shows a legacy instance with no driver on every Driver that publishes its type', () => {
      const rows = driverRows(
        stateWith({
          drivers: {
            venus: { info: batteryInfo('venus'), health: 'online' },
            wattcycle: { info: batteryInfo('wattcycle'), health: 'online' },
          },
          batteries: { '512': {} as never },
        }),
      )
      expect(idsOf(rows, 'venus')).toEqual(['512'])
      expect(idsOf(rows, 'wattcycle')).toEqual(['512'])
      expect(rows).toHaveLength(2)
    })

    it('puts an instance naming an unknown Driver in the fallback row of its type', () => {
      const rows = driverRows(
        stateWith({
          drivers: { venus: { info: batteryInfo('venus'), health: 'online' } },
          batteries: { '512': { driver: 'venus' } as never, ghost: { driver: 'gone' } as never },
        }),
      )
      expect(idsOf(rows, 'venus')).toEqual(['512'])
      expect(rows.find((r) => r.key === 'venus')?.entityCount).toBe(1)
      expect(rows.find((r) => r.key === 'domain:battery')).toMatchObject({
        entities: [{ type: 'battery', label: 'Batteries', ids: ['ghost'] }],
        entityCount: 1,
      })
    })

    it('keeps an instance naming an unknown Driver in the fallback row even when no Driver is on the bus', () => {
      const rows = driverRows(stateWith({ batteries: { '1': { driver: 'gone' } as never } }))
      expect(rows.map((r) => r.key)).toEqual(['domain:battery'])
    })

    it('mixes named, legacy and orphan instances of one type', () => {
      const rows = driverRows(
        stateWith({
          drivers: {
            venus: { info: batteryInfo('venus'), health: 'online' },
            wattcycle: { info: batteryInfo('wattcycle'), health: 'online' },
          },
          batteries: {
            named: { driver: 'wattcycle' } as never,
            legacy: {} as never,
            orphan: { driver: 'gone' } as never,
          },
        }),
      )
      expect(idsOf(rows, 'venus')).toEqual(['legacy'])
      expect(idsOf(rows, 'wattcycle')).toEqual(['named', 'legacy'])
      expect(idsOf(rows, 'domain:battery')).toEqual(['orphan'])
    })

    it('lists an instance that names a Driver without info under that Driver, whose count stays unknown', () => {
      const rows = driverRows(
        stateWith({
          drivers: { wattcycle: { health: 'online' } },
          batteries: { named: { driver: 'wattcycle' } as never, legacy: {} as never },
        }),
      )
      expect(idsOf(rows, 'wattcycle')).toEqual(['named'])
      expect(rows.find((r) => r.key === 'wattcycle')?.entityCount).toBeNull()
      expect(idsOf(rows, 'domain:battery')).toEqual(['legacy'])
    })
  })

  describe('the five states of a Driver', () => {
    const row = (drivers: RenewvanBusState['drivers']) => driverRows(stateWith({ drivers }))[0]

    it('online with info: green, Online, the published version', () => {
      expect(row({ tank: { info: tankInfo, health: 'online' } })).toMatchObject({
        tone: 'ok',
        status: 'Online',
        version: 'v0.8.0',
        dim: false,
      })
    })

    it('online without info: amber, Online, version Unknown', () => {
      expect(row({ gps: { health: 'online' } })).toMatchObject({
        tone: 'unknown',
        status: 'Online',
        version: 'Unknown',
        dim: false,
      })
    })

    it('offline with info: grey, Offline, last seen version, dimmed', () => {
      expect(
        row({ tank: { info: { ...tankInfo, version: 'v0.1.0' }, health: 'offline' } }),
      ).toMatchObject({
        tone: 'offline',
        status: 'Offline',
        version: 'offline, last seen v0.1.0',
        dim: true,
      })
    })

    it('a dev build reads as dev, green and Online', () => {
      expect(
        row({ tank: { info: { ...tankInfo, version: 'dev' }, health: 'online' } }),
      ).toMatchObject({
        tone: 'ok',
        status: 'Online',
        version: 'dev',
      })
    })

    it('info without health: grey, Unknown, the version as published, not dimmed', () => {
      expect(row({ tank: { info: tankInfo } })).toMatchObject({
        tone: 'offline',
        status: 'Unknown',
        version: 'v0.8.0',
        dim: false,
      })
    })

    it('offline without info: grey, Offline, version Unknown', () => {
      expect(row({ gps: { health: 'offline' } })).toMatchObject({
        tone: 'offline',
        status: 'Offline',
        version: 'Unknown',
      })
    })
  })

  describe('fallback rows', () => {
    it('gives entities no Driver claims a row by entity type, labelled as before, version Unknown', () => {
      const rows = driverRows(
        stateWith({ tanks: { fresh: {} as never }, gps: { '0': {} as never } }),
      )
      expect(rows).toEqual([
        expect.objectContaining({
          key: 'domain:gps',
          name: 'GPS',
          version: 'Unknown',
          entityCount: 1,
        }),
        expect.objectContaining({
          key: 'domain:tank',
          name: 'Tanks',
          version: 'Unknown',
          status: 'Unknown',
          entityCount: 1,
        }),
      ])
    })

    it('omits the fallback row once a Driver claims that entity type', () => {
      const rows = driverRows(
        stateWith({ drivers: { tank: { info: tankInfo } }, tanks: { fresh: {} as never } }),
      )
      expect(rows.map((r) => r.key)).toEqual(['tank'])
    })

    it('keeps a fallback row for an entity type the Driver did not claim', () => {
      const rows = driverRows(
        stateWith({
          drivers: { tank: { info: tankInfo } },
          tanks: { fresh: {} as never },
          gps: { '0': {} as never },
        }),
      )
      expect(rows.map((r) => r.key)).toEqual(['domain:gps', 'tank'])
    })

    it('does not create a row for an entity type with no entities', () => {
      expect(driverRows(stateWith({ drivers: {} }))).toEqual([])
    })

    it('does not treat a health-only Driver as claiming anything (no publishes known)', () => {
      const rows = driverRows(
        stateWith({ drivers: { tank: { health: 'online' } }, tanks: { fresh: {} as never } }),
      )
      expect(rows.map((r) => r.key)).toEqual(['tank', 'domain:tank'])
    })

    it('does not know how many entities a Driver with no info publishes, so it counts none', () => {
      const [health] = driverRows(
        stateWith({ drivers: { tank: { health: 'online' } }, tanks: { fresh: {} as never } }),
      )
      expect(health.entityCount).toBeNull()
    })
  })

  it('names a Driver by its driver key, hyphens as spaces, words capitalised (GPS and ESP32 as acronyms), whatever its product', () => {
    const rows = driverRows(
      stateWith({
        drivers: {
          tank: { info: tankInfo },
          mystery: { health: 'online' },
          gps: { health: 'online' },
          'esp32-16x-relay': { health: 'online' },
        },
      }),
    )
    expect(rows.map((r) => [r.key, r.name])).toEqual([
      ['esp32-16x-relay', 'ESP32 16x Relay'],
      ['gps', 'GPS'],
      ['mystery', 'Mystery'],
      ['tank', 'Tank'],
    ])
  })

  it('lists Drivers and fallback rows together, alphabetically by the name each is shown under', () => {
    const rows = driverRows(
      stateWith({
        drivers: { venus: { health: 'online' }, tank: { health: 'online' } },
        tilt: { '0': {} as never },
        tanks: { fresh: {} as never },
      }),
    )
    // The `tank` Driver claims nothing (no info), so the Tanks and Tilt fallbacks stay.
    expect(rows.map((r) => r.name)).toEqual(['Tank', 'Tanks', 'Tilt', 'Venus'])
    expect(rows.map((r) => r.key)).toEqual(['tank', 'domain:tank', 'domain:tilt', 'venus'])
  })

  it('sorts by the name on screen, not the key behind it, and ignores case', () => {
    const relayInfo: DriverInfo = {
      driver: 'esp32-16x-relay',
      product: 'ESP32 16-channel relay board',
      source: 'ESP32',
      publishes: ['relay'],
      version: 'v0.1.0',
    }
    const rows = driverRows(
      stateWith({
        // `esp32-16x-relay` is shown as "ESP32 16x Relay": it sorts under E, before GPS and Mystery.
        drivers: {
          'esp32-16x-relay': { info: relayInfo, health: 'online' },
          mystery: { health: 'online' },
          gps: { health: 'online' },
          Zebra: { health: 'online' },
        },
      }),
    )
    expect(rows.map((r) => r.name)).toEqual(['ESP32 16x Relay', 'GPS', 'Mystery', 'Zebra'])
  })
})

describe('driversSummary', () => {
  it('pluralises and handles none', () => {
    const row = (key: string) => ({ key }) as never
    expect(driversSummary([])).toBe('No drivers connected')
    expect(driversSummary([row('tank')])).toBe('1 driver')
    expect(driversSummary([row('tank'), row('gps')])).toBe('2 drivers')
  })
})

describe('relayDriversOnline', () => {
  const relayInfo: DriverInfo = {
    driver: 'esp32-16x-relay',
    product: 'ESP32 16-channel relay board',
    source: 'ESP32 with two chained SN74HC595 shift registers',
    publishes: ['relay'],
    version: 'v0.1.0',
  }

  it('is true only when the Driver that publishes relay is online', () => {
    const drivers = { 'esp32-16x-relay': { info: relayInfo, health: 'online' as const } }
    expect(relayDriversOnline(stateWith({ drivers }))).toBe(true)
  })

  it('finds the relay Driver by what it publishes, whatever its key', () => {
    const drivers = {
      whatever: { info: { ...relayInfo, driver: 'whatever' }, health: 'online' as const },
    }
    expect(relayDriversOnline(stateWith({ drivers }))).toBe(true)
  })

  it('is false when the relay Driver is offline', () => {
    const drivers = { 'esp32-16x-relay': { info: relayInfo, health: 'offline' as const } }
    expect(relayDriversOnline(stateWith({ drivers }))).toBe(false)
  })

  it('is false for a Driver with info but no health: half-started is not trusted', () => {
    const drivers = { 'esp32-16x-relay': { info: relayInfo } }
    expect(relayDriversOnline(stateWith({ drivers }))).toBe(false)
  })

  it('is false when no Driver publishes relay at all', () => {
    const tank = { tank: { info: tankInfo, health: 'online' as const } }
    expect(relayDriversOnline(stateWith({ drivers: tank }))).toBe(false)
    expect(relayDriversOnline(emptyRenewvanBusState)).toBe(false)
  })

  it('is false while any relay Driver is not online, so a stale on is never trusted', () => {
    const drivers = {
      'esp32-16x-relay': { info: relayInfo, health: 'online' as const },
      relay: { info: { ...relayInfo, driver: 'relay' }, health: 'offline' as const },
    }
    expect(relayDriversOnline(stateWith({ drivers }))).toBe(false)
  })

  it('ignores an online Driver that does not publish relay when the relay Driver is offline', () => {
    const drivers = {
      'esp32-16x-relay': { info: relayInfo, health: 'offline' as const },
      tank: { info: tankInfo, health: 'online' as const },
    }
    expect(relayDriversOnline(stateWith({ drivers }))).toBe(false)
  })
})

describe('tiltDriversOffline', () => {
  const tiltInfo: DriverInfo = {
    driver: 'tilt',
    product: 'GY-521 tilt sensor',
    source: 'MPU-6050 accelerometer (I2C)',
    publishes: ['tilt'],
    version: 'v0.3.0',
  }

  it('is true when the tilt Driver is offline: its retained angles are dead', () => {
    const drivers = { tilt: { info: tiltInfo, health: 'offline' as const } }
    expect(tiltDriversOffline(stateWith({ drivers }))).toBe(true)
  })

  it('finds the tilt Driver by what it publishes, whatever its key', () => {
    const drivers = {
      imu: { info: { ...tiltInfo, driver: 'imu' }, health: 'offline' as const },
    }
    expect(tiltDriversOffline(stateWith({ drivers }))).toBe(true)
  })

  it('is false while the tilt Driver is online', () => {
    const drivers = { tilt: { info: tiltInfo, health: 'online' as const } }
    expect(tiltDriversOffline(stateWith({ drivers }))).toBe(false)
  })

  it('is false when the health is unknown: only a known failure blanks a working tilt', () => {
    // Info arrives with `online` on connect, but a record can have info and no health yet, and a
    // van with no tilt Driver record at all still has a tilt that works.
    expect(tiltDriversOffline(stateWith({ drivers: { tilt: { info: tiltInfo } } }))).toBe(false)
    expect(
      tiltDriversOffline(stateWith({ drivers: { tilt: { health: 'offline' as const } } })),
    ).toBe(false)
    expect(tiltDriversOffline(emptyRenewvanBusState)).toBe(false)
  })

  it('ignores an offline Driver that does not publish tilt', () => {
    const drivers = {
      tilt: { info: tiltInfo, health: 'online' as const },
      tank: { info: tankInfo, health: 'offline' as const },
    }
    expect(tiltDriversOffline(stateWith({ drivers }))).toBe(false)
  })
})
