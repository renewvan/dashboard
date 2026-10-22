import { describe, expect, it } from 'vite-plus/test'
import { emptyRenewvanBusState, type DeviceInfo, type RenewvanBusState } from '@/types'
import { deviceRows, devicesSummary, relayDevicesOnline } from './devices'

function stateWith(partial: Partial<RenewvanBusState>): RenewvanBusState {
  return { ...emptyRenewvanBusState, ...partial }
}

const tankInfo: DeviceInfo = {
  device: 'tank',
  product: 'Tank device',
  source: 'ADS1115 (I2C)',
  publishes: ['tank'],
  version: 'v0.8.0',
}

describe('deviceRows', () => {
  it('is empty before anything has published', () => {
    expect(deviceRows(emptyRenewvanBusState)).toEqual([])
  })

  it('makes one row per Device, however many entity types it publishes', () => {
    const rows = deviceRows(
      stateWith({
        devices: {
          venus: {
            health: 'online',
            info: {
              device: 'venus',
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

  it('joins entities to a Device by the entity types it publishes', () => {
    const row = deviceRows(
      stateWith({
        devices: { tank: { info: tankInfo, health: 'online' } },
        tanks: { fresh: {} as never, grey: {} as never },
        gps: { '0': {} as never },
      }),
    ).find((r) => r.key === 'tank')
    expect(row).toMatchObject({ key: 'tank', entityCount: 2 })
  })

  describe('the five states of a Device', () => {
    const row = (devices: RenewvanBusState['devices']) => deviceRows(stateWith({ devices }))[0]

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
    it('gives entities no Device claims a row by entity type, labelled as before, version Unknown', () => {
      const rows = deviceRows(
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

    it('omits the fallback row once a Device claims that entity type', () => {
      const rows = deviceRows(
        stateWith({ devices: { tank: { info: tankInfo } }, tanks: { fresh: {} as never } }),
      )
      expect(rows.map((r) => r.key)).toEqual(['tank'])
    })

    it('keeps a fallback row for an entity type the Device did not claim', () => {
      const rows = deviceRows(
        stateWith({
          devices: { tank: { info: tankInfo } },
          tanks: { fresh: {} as never },
          gps: { '0': {} as never },
        }),
      )
      expect(rows.map((r) => r.key)).toEqual(['domain:gps', 'tank'])
    })

    it('does not create a row for an entity type with no entities', () => {
      expect(deviceRows(stateWith({ devices: {} }))).toEqual([])
    })

    it('does not treat a health-only Device as claiming anything (no publishes known)', () => {
      const rows = deviceRows(
        stateWith({ devices: { tank: { health: 'online' } }, tanks: { fresh: {} as never } }),
      )
      expect(rows.map((r) => r.key)).toEqual(['tank', 'domain:tank'])
    })

    it('does not know how many entities a Device with no info publishes, so it counts none', () => {
      const [health] = deviceRows(
        stateWith({ devices: { tank: { health: 'online' } }, tanks: { fresh: {} as never } }),
      )
      expect(health.entityCount).toBeNull()
    })
  })

  it('names a Device by its capitalised device key (GPS as an acronym), whatever its product', () => {
    const rows = deviceRows(
      stateWith({
        devices: {
          tank: { info: tankInfo },
          mystery: { health: 'online' },
          gps: { health: 'online' },
        },
      }),
    )
    expect(rows.map((r) => [r.key, r.name])).toEqual([
      ['gps', 'GPS'],
      ['mystery', 'Mystery'],
      ['tank', 'Tank'],
    ])
  })

  it('lists Devices and fallback rows together, alphabetically by the name each is shown under', () => {
    const rows = deviceRows(
      stateWith({
        devices: { venus: { health: 'online' }, tank: { health: 'online' } },
        tilt: { '0': {} as never },
        tanks: { fresh: {} as never },
      }),
    )
    // The `tank` Device claims nothing (no info), so the Tanks and Tilt fallbacks stay.
    expect(rows.map((r) => r.name)).toEqual(['Tank', 'Tanks', 'Tilt', 'Venus'])
    expect(rows.map((r) => r.key)).toEqual(['tank', 'domain:tank', 'domain:tilt', 'venus'])
  })

  it('sorts by the name on screen, not the key behind it, and ignores case', () => {
    const relayInfo: DeviceInfo = {
      device: 'esp32-relay',
      product: 'ESP32 16-channel relay board',
      source: 'ESP32',
      publishes: ['relay'],
      version: 'v0.1.0',
    }
    const rows = deviceRows(
      stateWith({
        // `esp32-relay` is shown as "Relays": it sorts under R, after Mystery, not under E.
        devices: {
          'esp32-relay': { info: relayInfo, health: 'online' },
          mystery: { health: 'online' },
          gps: { health: 'online' },
          Zebra: { health: 'online' },
        },
      }),
    )
    expect(rows.map((r) => r.name)).toEqual(['GPS', 'Mystery', 'Relays', 'Zebra'])
  })
})

describe('devicesSummary', () => {
  it('pluralises and handles none', () => {
    const row = (key: string) => ({ key }) as never
    expect(devicesSummary([])).toBe('No devices connected')
    expect(devicesSummary([row('tank')])).toBe('1 device')
    expect(devicesSummary([row('tank'), row('gps')])).toBe('2 devices')
  })
})

describe('relayDevicesOnline', () => {
  const relayInfo: DeviceInfo = {
    device: 'esp32-relay',
    product: 'ESP32 16-channel relay board',
    source: 'ESP32 with two chained SN74HC595 shift registers',
    publishes: ['relay'],
    version: 'v0.1.0',
  }

  it('is true only when the Device that publishes relay is online', () => {
    const devices = { 'esp32-relay': { info: relayInfo, health: 'online' as const } }
    expect(relayDevicesOnline(stateWith({ devices }))).toBe(true)
  })

  it('finds the relay Device by what it publishes, whatever its key', () => {
    const devices = {
      whatever: { info: { ...relayInfo, device: 'whatever' }, health: 'online' as const },
    }
    expect(relayDevicesOnline(stateWith({ devices }))).toBe(true)
  })

  it('is false when the relay Device is offline', () => {
    const devices = { 'esp32-relay': { info: relayInfo, health: 'offline' as const } }
    expect(relayDevicesOnline(stateWith({ devices }))).toBe(false)
  })

  it('is false for a Device with info but no health: half-started is not trusted', () => {
    const devices = { 'esp32-relay': { info: relayInfo } }
    expect(relayDevicesOnline(stateWith({ devices }))).toBe(false)
  })

  it('is false when no Device publishes relay at all', () => {
    const tank = { tank: { info: tankInfo, health: 'online' as const } }
    expect(relayDevicesOnline(stateWith({ devices: tank }))).toBe(false)
    expect(relayDevicesOnline(emptyRenewvanBusState)).toBe(false)
  })

  it('is false while any relay Device is not online, so a stale on is never trusted', () => {
    const devices = {
      'esp32-relay': { info: relayInfo, health: 'online' as const },
      relay: { info: { ...relayInfo, device: 'relay' }, health: 'offline' as const },
    }
    expect(relayDevicesOnline(stateWith({ devices }))).toBe(false)
  })

  it('ignores an online Device that does not publish relay when the relay Device is offline', () => {
    const devices = {
      'esp32-relay': { info: relayInfo, health: 'offline' as const },
      tank: { info: tankInfo, health: 'online' as const },
    }
    expect(relayDevicesOnline(stateWith({ devices }))).toBe(false)
  })
})
