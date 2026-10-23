import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'
import type { DriverInfo, DriverRecord, RenewvanBusState } from '@/types'

const STORAGE_KEY = 'renewvan-dashboard-settings-nav-style'

const PI = '10000000a1b2c3d4'

const tankInfo: DriverInfo = {
  driver: 'tank',
  product: 'Tank driver',
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

/** A bus with one Driver (and the tank entities it publishes) in the given state. */
function busWith(driver: DriverRecord, key = 'tank'): Partial<RenewvanBusState> {
  return { drivers: { [key]: driver }, tanks: { fresh: completeTank, grey: completeTank } }
}

async function openDrivers(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /^Drivers/ }))
}

/** Opens Settings › Drivers › <label> for a bus holding one Driver. */
async function openDriver(driver: DriverRecord, key = 'tank', label = /^Tank/) {
  const rendered = renderSettings({}, { bus: busWith(driver, key) })
  await openDrivers(rendered.user)
  await rendered.user.click(screen.getByRole('button', { name: label }))
  return rendered
}

/** Opens Settings › Drivers › <label> › Driver. */
async function openDriverInfo(driver: DriverRecord, key = 'tank', label = /^Tank/) {
  const rendered = await openDriver(driver, key, label)
  await rendered.user.click(screen.getByRole('button', { name: 'Driver' }))
  return rendered
}

/** The Driver list as `[label, value]` pairs, in page order. */
function driverRows() {
  return within(screen.getByRole('region', { name: 'Driver' }))
    .getAllByRole('term')
    .map((term) => [term.textContent, term.nextElementSibling?.textContent])
}

const pageOf = () => screen.getByRole('region', { name: 'Driver' })

beforeEach(() => {
  window.localStorage.clear()
})

describe('Settings Drivers list', () => {
  it('lists one row per Driver as <version> · <N entities>, whatever its entity types', async () => {
    const { user } = renderSettings(
      {},
      {
        bus: {
          drivers: {
            tank: { info: tankInfo, health: 'online' },
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
          tanks: { fresh: completeTank, grey: completeTank },
          batteries: { '288': {} as never },
          solar: { '289': {} as never },
          chargers: { '290': {} as never, '291': {} as never },
        },
      },
    )
    await openDrivers(user)

    const list = screen.getByRole('list', { name: 'Published drivers' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['Tankv0.8.0 · 2 entities', 'Venusv0.3.0 · 4 entities'])
  })

  it('says a Driver with no info is of Unknown version, and shows an offline one as last seen', async () => {
    const { user } = renderSettings(
      {},
      {
        bus: {
          drivers: {
            gps: { health: 'online' },
            router: {
              health: 'offline',
              info: {
                ...tankInfo,
                driver: 'router',
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
    await openDrivers(user)

    const rows = within(screen.getByRole('list', { name: 'Published drivers' }))
      .getAllByRole('listitem')
      .map((row) => row.textContent)
    // Alphabetical by name. `gps` publishes no info, so its entities have no claimant and also get a
    // fallback row, which follows the Driver of the same name.
    expect(rows).toEqual([
      'GPSUnknown',
      'GPSUnknown · 1 entity',
      'Routeroffline, last seen v0.1.0 · 1 entity',
    ])
  })

  it('gives entities that no Driver claims a fallback row by entity type', async () => {
    const { user } = renderSettings({}, { bus: { tanks: { fresh: completeTank } } })
    await openDrivers(user)

    expect(
      within(screen.getByRole('list', { name: 'Published drivers' }))
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['TanksUnknown · 1 entity'])
  })

  it('says so when no driver has reported yet', async () => {
    const { user } = renderSettings()
    await openDrivers(user)

    expect(screen.getByText(/No drivers connected/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Published drivers' })).not.toBeInTheDocument()
  })
})

/** The Driver page's Status row: its text and its dot's colour class. */
function driverStatus() {
  const status = screen.getByLabelText('Driver status')
  return {
    text: within(status).getByRole('term').nextElementSibling?.textContent,
    dot: within(status).getByTestId('status-dot'),
  }
}

/** The Driver page's Firmware version value. */
const firmwareVersion = () => Object.fromEntries(driverRows())['Firmware version']

describe('Settings Driver page: the five states', () => {
  it('online with info: green dot, Online, nothing muted', async () => {
    await openDriver({ info: tankInfo, health: 'online' })

    expect(driverStatus().text).toBe('Online')
    expect(driverStatus().dot).toHaveClass('bg-success')
    expect(screen.getByRole('button', { name: 'Driver' }).closest('.opacity-60')).toBeNull()
  })

  it('online without info: amber dot, Online, then Unknown identity rows and a muted note on Driver', async () => {
    const { user } = await openDriver({ health: 'online' }, 'gps', /^GPS/)

    expect(driverStatus().text).toBe('Online')
    expect(driverStatus().dot).toHaveClass('bg-warning')

    await user.click(screen.getByRole('button', { name: 'Driver' }))
    expect(driverRows()).toEqual([
      ['Product', '—'],
      ['Source', '—'],
      ['Firmware version', 'Unknown'],
      ['Board serial', '—'],
      ['Manufacturer', '—'],
      ['Homepage', '—'],
    ])
    expect(screen.getByText(/no info/i)).toBeInTheDocument()
    expect(pageOf().closest('.opacity-60')).toBeNull()
  })

  it('offline with info: grey dot, Offline, last seen version, both pages at 60% opacity', async () => {
    const { user } = await openDriver({
      info: { ...tankInfo, version: 'v0.1.0' },
      health: 'offline',
    })

    expect(driverStatus().text).toBe('Offline')
    expect(driverStatus().dot).toHaveClass('bg-muted')
    expect(screen.getByRole('button', { name: 'Driver' }).closest('.opacity-60')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Driver' }))
    expect(driverRows().slice(0, 3)).toEqual([
      ['Product', 'Tank driver'],
      ['Source', 'ADS1115 (I2C)'],
      ['Firmware version', 'offline, last seen v0.1.0'],
    ])
    expect(pageOf().closest('.opacity-60')).not.toBeNull()
  })

  it('a dev build: green dot, Online, dev', async () => {
    const { user } = await openDriver({ info: { ...tankInfo, version: 'dev' }, health: 'online' })

    expect(driverStatus().text).toBe('Online')
    expect(driverStatus().dot).toHaveClass('bg-success')

    await user.click(screen.getByRole('button', { name: 'Driver' }))
    expect(firmwareVersion()).toBe('dev')
  })

  it('info with no health: grey dot, Unknown, the version as published, not dimmed', async () => {
    const { user } = await openDriver({ info: tankInfo })

    expect(driverStatus().text).toBe('Unknown')
    expect(driverStatus().dot).toHaveClass('bg-muted')
    expect(screen.getByRole('button', { name: 'Driver' }).closest('.opacity-60')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Driver' }))
    expect(firmwareVersion()).toBe('v0.8.0')
  })
})

describe('Settings Driver page: rows', () => {
  it('always shows Product, Source, Firmware version, Board serial, Manufacturer, Homepage, in that order, and no Status', async () => {
    await openDriverInfo({ info: tankInfo, health: 'online' })

    expect(driverRows().map(([label]) => label)).toEqual([
      'Product',
      'Source',
      'Firmware version',
      'Board serial',
      'Manufacturer',
      'Homepage',
    ])
  })

  it('shows the Board serial in full, and the homepage', async () => {
    await openDriverInfo({ info: tankInfo, health: 'online' })

    const rows = Object.fromEntries(driverRows())
    expect(rows['Board serial']).toBe(PI)
    expect(rows['Homepage']).toBe('https://github.com/renewvan/driver-tank')
  })

  it('reads Manufacturer as renewvan only when info exists without one', async () => {
    await openDriverInfo({ info: tankInfo, health: 'online' })
    expect(Object.fromEntries(driverRows())['Manufacturer']).toBe('renewvan')
  })

  it('shows the manufacturer the Driver reports', async () => {
    await openDriverInfo({ info: { ...tankInfo, manufacturer: 'Acme' }, health: 'online' })
    expect(Object.fromEntries(driverRows())['Manufacturer']).toBe('Acme')
  })

  it('shows an em dash for each optional value the Driver leaves out, never hiding the row', async () => {
    const { homepage: _h, board_serial: _s, ...bare } = tankInfo
    await openDriverInfo({ info: bare, health: 'online' })

    const rows = Object.fromEntries(driverRows())
    expect(rows['Board serial']).toBe('—')
    expect(rows['Homepage']).toBe('—')
  })

  it('hides the IP address row for a Driver that reports no address of its own', async () => {
    await openDriverInfo({ info: tankInfo, health: 'online' })

    expect(Object.fromEntries(driverRows())['IP address']).toBeUndefined()
  })

  it('shows the IP address a Driver with an address of its own reports', async () => {
    await openDriverInfo({ info: { ...tankInfo, ip: '192.168.10.57' }, health: 'online' })

    expect(Object.fromEntries(driverRows())['IP address']).toBe('192.168.10.57')
  })

  it('leaves the Board serial out of the compact Drivers list', async () => {
    const { user } = renderSettings({}, { bus: busWith({ info: tankInfo, health: 'online' }) })
    await openDrivers(user)

    expect(screen.queryByText(PI)).not.toBeInTheDocument()
  })
})

describe('Settings Driver page: navigation', () => {
  it('titles a Driver page by its name, with a Back button named Drivers', async () => {
    await openDriver({ info: tankInfo, health: 'online' })

    expect(screen.getByRole('button', { name: 'Drivers' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tank' })).toBeInTheDocument()
  })

  it('opens Driver below the Driver, with a Back button named for the Driver', async () => {
    await openDriverInfo({ info: tankInfo, health: 'online' })

    expect(screen.getByRole('heading', { name: 'Driver' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tank' })).toBeInTheDocument()
  })

  it('walks Driver → Tank → Drivers with Back', async () => {
    const { user } = await openDriverInfo({ info: tankInfo, health: 'online' })

    await user.click(screen.getByRole('button', { name: 'Tank' }))
    expect(screen.getByRole('heading', { name: 'Tank' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Driver' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Drivers' }))
    expect(screen.getByRole('list', { name: 'Published drivers' })).toBeInTheDocument()
  })

  it('names a Driver with no info by its key, GPS as an acronym', async () => {
    await openDriver({ health: 'online' }, 'gps', /^GPS/)
    expect(screen.getByRole('heading', { name: 'GPS' })).toBeInTheDocument()
  })

  it('falls back to the Drivers list when ?driver= names a Driver that is not reported', () => {
    renderSettings(
      {},
      {
        bus: busWith({ info: tankInfo, health: 'online' }),
        url: '/?page=settings&view=driver-info&driver=nope',
      },
    )

    expect(screen.getByRole('list', { name: 'Published drivers' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Driver' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Drivers' })).toBeInTheDocument()
  })

  it('falls back to the Drivers list when view=driver has no driver at all', () => {
    renderSettings({}, { bus: busWith({ info: tankInfo }), url: '/?page=settings&view=driver' })

    expect(screen.getByRole('list', { name: 'Published drivers' })).toBeInTheDocument()
  })

  it('opens a deep link to a reported Driver, and to its Driver page', () => {
    const bus = busWith({ info: tankInfo, health: 'online' })
    const { unmount } = renderSettings({}, { bus, url: '/?page=settings&view=driver&driver=tank' })
    expect(screen.getByRole('heading', { name: 'Tank' })).toBeInTheDocument()
    unmount()

    renderSettings({}, { bus, url: '/?page=settings&view=driver-info&driver=tank' })
    expect(screen.getByRole('heading', { name: 'Driver' })).toBeInTheDocument()
    expect(Object.fromEntries(driverRows())['Product']).toBe('Tank driver')
  })

  it('opens a fallback row by its domain key', () => {
    renderSettings(
      {},
      {
        bus: { gps: { '0': {} as never } },
        url: '/?page=settings&view=driver-info&driver=domain%3Agps',
      },
    )
    expect(screen.getByRole('heading', { name: 'Driver' })).toBeInTheDocument()
    expect(firmwareVersion()).toBe('Unknown')
  })

  describe('as a drawer', () => {
    beforeEach(() => window.localStorage.setItem(STORAGE_KEY, 'drawer'))

    it('opens Driver in the drawer below the Driver, and Back steps up one level at a time', async () => {
      const { user } = renderSettings({}, { bus: busWith({ info: tankInfo, health: 'online' }) })
      await openDrivers(user)
      await user.click(
        await within(await screen.findByRole('dialog', { name: 'Drivers' })).findByRole('button', {
          name: /^Tank/,
        }),
      )
      const driver = await screen.findByRole('dialog', { name: 'Tank' })
      await user.click(within(driver).getByRole('button', { name: 'Driver' }))

      const driverInfo = await screen.findByRole('dialog', { name: 'Driver' })
      expect(within(driverInfo).getByText('v0.8.0')).toBeInTheDocument()

      await user.click(within(driverInfo).getByRole('button', { name: 'Back' }))
      expect(await screen.findByRole('dialog', { name: 'Tank' })).toBeInTheDocument()
    })
  })
})

describe('Settings Driver page: entities', () => {
  it('lists the entities the Driver publishes, and opens Tanks from its Publishes row', async () => {
    const { user } = await openDriver({ info: tankInfo, health: 'online' })

    await user.click(screen.getByRole('button', { name: /^Tanks/ }))

    expect(screen.getByRole('heading', { name: 'Tanks' })).toBeInTheDocument()
  })

  it('summarises the GPS row by the fix when a receiver is publishing, instead of the entity count', async () => {
    const rendered = renderSettings(
      {},
      {
        bus: { gps: { van: { fix_quality: 'gps', satellites_in_use: 9 } } },
      },
    )
    await openDrivers(rendered.user)
    await rendered.user.click(screen.getByRole('button', { name: /^GPS/ }))

    expect(within(screen.getByRole('list', { name: 'Entities' })).getByText(/9 satellites in use/))
  })

  it('says no data yet on the GPS row while the bus record is still incomplete', async () => {
    const rendered = renderSettings({}, { bus: { gps: { van: {} as never } } })
    await openDrivers(rendered.user)
    await rendered.user.click(screen.getByRole('button', { name: /^GPS/ }))

    expect(
      within(screen.getByRole('list', { name: 'Entities' })).getByText('No data yet'),
    ).toBeInTheDocument()
  })
})
