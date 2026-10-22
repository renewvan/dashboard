import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'
import type { DeviceInfo, DeviceRecord, RenewvanBusState } from '@/types'

const STORAGE_KEY = 'renewvan-dashboard-settings-nav-style'

const PI = '10000000a1b2c3d4'

const tankInfo: DeviceInfo = {
  device: 'tank',
  product: 'Tank device',
  source: 'ADS1115 (I2C)',
  publishes: ['tank'],
  version: 'v0.8.0',
  homepage: 'https://github.com/renewvan/driver-tank',
  board_serial: PI,
}

const completeTank = {
  fluid_type: 'fresh_water' as const,
  capacity_l: 100,
  level_pct: 62,
  status: 'ok' as const,
  volume_since_full_l: 0,
  volume_since_empty_l: 0,
}

/** A bus with one Device (and the tank entities it publishes) in the given state. */
function busWith(device: DeviceRecord, key = 'tank'): Partial<RenewvanBusState> {
  return { devices: { [key]: device }, tanks: { fresh: completeTank, grey: completeTank } }
}

async function openDevices(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /^Devices/ }))
}

/** Opens Settings › Devices › <label> for a bus holding one Device. */
async function openDevice(device: DeviceRecord, key = 'tank', label = /^Tank/) {
  const rendered = renderSettings({}, { bus: busWith(device, key) })
  await openDevices(rendered.user)
  await rendered.user.click(screen.getByRole('button', { name: label }))
  return rendered
}

/** Opens Settings › Devices › <label> › Device. */
async function openDeviceInfo(device: DeviceRecord, key = 'tank', label = /^Tank/) {
  const rendered = await openDevice(device, key, label)
  await rendered.user.click(screen.getByRole('button', { name: 'Device' }))
  return rendered
}

/** The Device list as `[label, value]` pairs, in page order. */
function deviceRows() {
  return within(screen.getByRole('region', { name: 'Device' }))
    .getAllByRole('term')
    .map((term) => [term.textContent, term.nextElementSibling?.textContent])
}

const pageOf = () => screen.getByRole('region', { name: 'Device' })

beforeEach(() => {
  window.localStorage.clear()
})

describe('Settings Devices list', () => {
  it('lists one row per Device as <version> · <N entities>, whatever its entity types', async () => {
    const { user } = renderSettings(
      {},
      {
        bus: {
          devices: {
            tank: { info: tankInfo, health: 'online' },
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
          tanks: { fresh: completeTank, grey: completeTank },
          batteries: { '288': {} as never },
          solar: { '289': {} as never },
          chargers: { '290': {} as never, '291': {} as never },
        },
      },
    )
    await openDevices(user)

    const list = screen.getByRole('list', { name: 'Published devices' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['Tankv0.8.0 · 2 entities', 'Venusv0.3.0 · 4 entities'])
  })

  it('says a Device with no info is of Unknown version, and shows an offline one as last seen', async () => {
    const { user } = renderSettings(
      {},
      {
        bus: {
          devices: {
            gps: { health: 'online' },
            router: {
              health: 'offline',
              info: {
                ...tankInfo,
                device: 'router',
                product: 'Router bridge',
                publishes: ['router'],
                version: 'v0.1.0',
              },
            },
          },
          gps: { '0': {} as never },
          routers: { '0': {} as never },
        },
      },
    )
    await openDevices(user)

    const rows = within(screen.getByRole('list', { name: 'Published devices' }))
      .getAllByRole('listitem')
      .map((row) => row.textContent)
    // Alphabetical by name. `gps` publishes no info, so its entities have no claimant and also get a
    // fallback row, which follows the Device of the same name.
    expect(rows).toEqual([
      'GPSUnknown',
      'GPSUnknown · 1 entity',
      'Routeroffline, last seen v0.1.0 · 1 entity',
    ])
  })

  it('gives entities that no Device claims a fallback row by entity type', async () => {
    const { user } = renderSettings({}, { bus: { tanks: { fresh: completeTank } } })
    await openDevices(user)

    expect(
      within(screen.getByRole('list', { name: 'Published devices' }))
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['TanksUnknown · 1 entity'])
  })

  it('says so when no device has reported yet', async () => {
    const { user } = renderSettings()
    await openDevices(user)

    expect(screen.getByText(/No devices connected/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Published devices' })).not.toBeInTheDocument()
  })
})

/** The Device page's Status row: its text and its dot's colour class. */
function deviceStatus() {
  const status = screen.getByLabelText('Device status')
  return {
    text: within(status).getByRole('term').nextElementSibling?.textContent,
    dot: within(status).getByTestId('status-dot'),
  }
}

/** The Device page's Firmware version value. */
const firmwareVersion = () => Object.fromEntries(deviceRows())['Firmware version']

describe('Settings Device page: the five states', () => {
  it('online with info: green dot, Online, nothing muted', async () => {
    await openDevice({ info: tankInfo, health: 'online' })

    expect(deviceStatus().text).toBe('Online')
    expect(deviceStatus().dot).toHaveClass('bg-success')
    expect(screen.getByRole('button', { name: 'Device' }).closest('.opacity-60')).toBeNull()
  })

  it('online without info: amber dot, Online, then Unknown identity rows and a muted note on Device', async () => {
    const { user } = await openDevice({ health: 'online' }, 'gps', /^GPS/)

    expect(deviceStatus().text).toBe('Online')
    expect(deviceStatus().dot).toHaveClass('bg-warning')

    await user.click(screen.getByRole('button', { name: 'Device' }))
    expect(deviceRows()).toEqual([
      ['Product', '—'],
      ['Source', '—'],
      ['Firmware version', 'Unknown'],
      ['Board serial', '—'],
      ['IP address', '—'],
      ['Manufacturer', '—'],
      ['Homepage', '—'],
    ])
    expect(screen.getByText(/no info/i)).toBeInTheDocument()
    expect(pageOf().closest('.opacity-60')).toBeNull()
  })

  it('offline with info: grey dot, Offline, last seen version, both pages at 60% opacity', async () => {
    const { user } = await openDevice({
      info: { ...tankInfo, version: 'v0.1.0' },
      health: 'offline',
    })

    expect(deviceStatus().text).toBe('Offline')
    expect(deviceStatus().dot).toHaveClass('bg-muted')
    expect(screen.getByRole('button', { name: 'Device' }).closest('.opacity-60')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Device' }))
    expect(deviceRows().slice(0, 3)).toEqual([
      ['Product', 'Tank device'],
      ['Source', 'ADS1115 (I2C)'],
      ['Firmware version', 'offline, last seen v0.1.0'],
    ])
    expect(pageOf().closest('.opacity-60')).not.toBeNull()
  })

  it('a dev build: green dot, Online, dev', async () => {
    const { user } = await openDevice({ info: { ...tankInfo, version: 'dev' }, health: 'online' })

    expect(deviceStatus().text).toBe('Online')
    expect(deviceStatus().dot).toHaveClass('bg-success')

    await user.click(screen.getByRole('button', { name: 'Device' }))
    expect(firmwareVersion()).toBe('dev')
  })

  it('info with no health: grey dot, Unknown, the version as published, not dimmed', async () => {
    const { user } = await openDevice({ info: tankInfo })

    expect(deviceStatus().text).toBe('Unknown')
    expect(deviceStatus().dot).toHaveClass('bg-muted')
    expect(screen.getByRole('button', { name: 'Device' }).closest('.opacity-60')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Device' }))
    expect(firmwareVersion()).toBe('v0.8.0')
  })
})

describe('Settings Device page: rows', () => {
  it('always shows Product, Source, Firmware version, Board serial, IP address, Manufacturer, Homepage, in that order, and no Status', async () => {
    await openDeviceInfo({ info: tankInfo, health: 'online' })

    expect(deviceRows().map(([label]) => label)).toEqual([
      'Product',
      'Source',
      'Firmware version',
      'Board serial',
      'IP address',
      'Manufacturer',
      'Homepage',
    ])
  })

  it('shows the Board serial in full, and the homepage', async () => {
    await openDeviceInfo({ info: tankInfo, health: 'online' })

    const rows = Object.fromEntries(deviceRows())
    expect(rows['Board serial']).toBe(PI)
    expect(rows['Homepage']).toBe('https://github.com/renewvan/driver-tank')
  })

  it('reads Manufacturer as renewvan only when info exists without one', async () => {
    await openDeviceInfo({ info: tankInfo, health: 'online' })
    expect(Object.fromEntries(deviceRows())['Manufacturer']).toBe('renewvan')
  })

  it('shows the manufacturer the Device reports', async () => {
    await openDeviceInfo({ info: { ...tankInfo, manufacturer: 'Acme' }, health: 'online' })
    expect(Object.fromEntries(deviceRows())['Manufacturer']).toBe('Acme')
  })

  it('shows an em dash for each optional value the Device leaves out, never hiding the row', async () => {
    const { homepage: _h, board_serial: _s, ...bare } = tankInfo
    await openDeviceInfo({ info: bare, health: 'online' })

    const rows = Object.fromEntries(deviceRows())
    expect(rows['Board serial']).toBe('—')
    expect(rows['IP address']).toBe('—')
    expect(rows['Homepage']).toBe('—')
  })

  it('shows the IP address a Device with an address of its own reports', async () => {
    await openDeviceInfo({ info: { ...tankInfo, ip: '192.168.10.57' }, health: 'online' })

    expect(Object.fromEntries(deviceRows())['IP address']).toBe('192.168.10.57')
  })

  it('leaves the Board serial out of the compact Devices list', async () => {
    const { user } = renderSettings({}, { bus: busWith({ info: tankInfo, health: 'online' }) })
    await openDevices(user)

    expect(screen.queryByText(PI)).not.toBeInTheDocument()
  })
})

describe('Settings Device page: navigation', () => {
  it('titles a Device page by its name, with a Back button named Devices', async () => {
    await openDevice({ info: tankInfo, health: 'online' })

    expect(screen.getByRole('button', { name: 'Devices' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tank' })).toBeInTheDocument()
  })

  it('opens Device below the Device, with a Back button named for the Device', async () => {
    await openDeviceInfo({ info: tankInfo, health: 'online' })

    expect(screen.getByRole('heading', { name: 'Device' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tank' })).toBeInTheDocument()
  })

  it('walks Device → Tank → Devices with Back', async () => {
    const { user } = await openDeviceInfo({ info: tankInfo, health: 'online' })

    await user.click(screen.getByRole('button', { name: 'Tank' }))
    expect(screen.getByRole('heading', { name: 'Tank' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Device' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Devices' }))
    expect(screen.getByRole('list', { name: 'Published devices' })).toBeInTheDocument()
  })

  it('names a Device with no info by its key, GPS as an acronym', async () => {
    await openDevice({ health: 'online' }, 'gps', /^GPS/)
    expect(screen.getByRole('heading', { name: 'GPS' })).toBeInTheDocument()
  })

  it('falls back to the Devices list when ?device= names a Device that is not reported', () => {
    renderSettings(
      {},
      {
        bus: busWith({ info: tankInfo, health: 'online' }),
        url: '/?page=settings&view=device-info&device=nope',
      },
    )

    expect(screen.getByRole('list', { name: 'Published devices' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Device' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Devices' })).toBeInTheDocument()
  })

  it('falls back to the Devices list when view=device has no device at all', () => {
    renderSettings({}, { bus: busWith({ info: tankInfo }), url: '/?page=settings&view=device' })

    expect(screen.getByRole('list', { name: 'Published devices' })).toBeInTheDocument()
  })

  it('opens a deep link to a reported Device, and to its Device page', () => {
    const bus = busWith({ info: tankInfo, health: 'online' })
    const { unmount } = renderSettings({}, { bus, url: '/?page=settings&view=device&device=tank' })
    expect(screen.getByRole('heading', { name: 'Tank' })).toBeInTheDocument()
    unmount()

    renderSettings({}, { bus, url: '/?page=settings&view=device-info&device=tank' })
    expect(screen.getByRole('heading', { name: 'Device' })).toBeInTheDocument()
    expect(Object.fromEntries(deviceRows())['Product']).toBe('Tank device')
  })

  it('opens a fallback row by its domain key', () => {
    renderSettings(
      {},
      {
        bus: { gps: { '0': {} as never } },
        url: '/?page=settings&view=device-info&device=domain%3Agps',
      },
    )
    expect(screen.getByRole('heading', { name: 'Device' })).toBeInTheDocument()
    expect(firmwareVersion()).toBe('Unknown')
  })

  describe('as a drawer', () => {
    beforeEach(() => window.localStorage.setItem(STORAGE_KEY, 'drawer'))

    it('opens Device in the drawer below the Device, and Back steps up one level at a time', async () => {
      const { user } = renderSettings({}, { bus: busWith({ info: tankInfo, health: 'online' }) })
      await openDevices(user)
      await user.click(
        await within(await screen.findByRole('dialog', { name: 'Devices' })).findByRole('button', {
          name: /^Tank/,
        }),
      )
      const device = await screen.findByRole('dialog', { name: 'Tank' })
      await user.click(within(device).getByRole('button', { name: 'Device' }))

      const deviceInfo = await screen.findByRole('dialog', { name: 'Device' })
      expect(within(deviceInfo).getByText('v0.8.0')).toBeInTheDocument()

      await user.click(within(deviceInfo).getByRole('button', { name: 'Back' }))
      expect(await screen.findByRole('dialog', { name: 'Tank' })).toBeInTheDocument()
    })
  })
})

describe('Settings Device page: entities', () => {
  it('lists the entities the Device publishes, and opens Tanks from its Publishes row', async () => {
    const { user } = await openDevice({ info: tankInfo, health: 'online' })

    await user.click(screen.getByRole('button', { name: /^Tanks/ }))

    expect(screen.getByRole('heading', { name: 'Tanks' })).toBeInTheDocument()
  })
})
