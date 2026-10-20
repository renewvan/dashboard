import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'
import type { NodeInfo, NodeRecord, RenewvanBusState } from '@/types'

const STORAGE_KEY = 'renewvan-dashboard-settings-nav-style'

const PI = '10000000a1b2c3d4'

const tankInfo: NodeInfo = {
  node: 'tank',
  product: 'Tank node',
  source: 'ADS1115 (I2C)',
  publishes: ['tank'],
  version: 'v0.8.0',
  homepage: 'https://github.com/renewvan/node-tank',
  host_serial: PI,
}

const completeTank = {
  fluid_type: 'fresh_water' as const,
  capacity_l: 100,
  level_pct: 62,
  status: 'ok' as const,
  volume_since_full_l: 0,
  volume_since_empty_l: 0,
}

/** A bus with one Node (and the tank entities it publishes) in the given state. */
function busWith(node: NodeRecord, key = 'tank'): Partial<RenewvanBusState> {
  return { nodes: { [key]: node }, tanks: { fresh: completeTank, grey: completeTank } }
}

async function openNodes(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /^Nodes/ }))
}

/** Opens Settings › Nodes › <label> for a bus holding one Node. */
async function openDevice(node: NodeRecord, key = 'tank', label = /^Tank node/) {
  const rendered = renderSettings({}, { bus: busWith(node, key) })
  await openNodes(rendered.user)
  await rendered.user.click(screen.getByRole('button', { name: label }))
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

describe('Settings Nodes list', () => {
  it('lists one row per Node as <version> · <N entities>, whatever its entity types', async () => {
    const { user } = renderSettings(
      {},
      {
        bus: {
          nodes: {
            tank: { info: tankInfo, health: 'online' },
            venus: {
              health: 'online',
              info: {
                node: 'venus',
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
    await openNodes(user)

    const list = screen.getByRole('list', { name: 'Published nodes' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['Tank nodev0.8.0 · 2 entities', 'Venus OS bridgev0.3.0 · 4 entities'])
  })

  it('says a Node with no info is of Unknown version, and shows an offline one as last seen', async () => {
    const { user } = renderSettings(
      {},
      {
        bus: {
          nodes: {
            gps: { health: 'online' },
            router: {
              health: 'offline',
              info: {
                ...tankInfo,
                node: 'router',
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
    await openNodes(user)

    const rows = within(screen.getByRole('list', { name: 'Published nodes' }))
      .getAllByRole('listitem')
      .map((row) => row.textContent)
    // `gps` publishes no info, so its entities have no claimant and also get a fallback row.
    expect(rows).toEqual([
      'gpsUnknown',
      'Router bridgeoffline, last seen v0.1.0 · 1 entity',
      'GPSUnknown · 1 entity',
    ])
  })

  it('gives entities that no Node claims a fallback row by entity type', async () => {
    const { user } = renderSettings({}, { bus: { tanks: { fresh: completeTank } } })
    await openNodes(user)

    expect(
      within(screen.getByRole('list', { name: 'Published nodes' }))
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['TanksUnknown · 1 entity'])
  })

  it('says so when no node has reported yet', async () => {
    const { user } = renderSettings()
    await openNodes(user)

    expect(screen.getByText(/No nodes connected/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Published nodes' })).not.toBeInTheDocument()
  })
})

describe('Settings Node page: the five states', () => {
  it('online with info: green dot, Online, the published version, nothing muted', async () => {
    await openDevice({ info: tankInfo, health: 'online' })

    expect(deviceRows().slice(0, 4)).toEqual([
      ['Status', 'Online'],
      ['Product', 'Tank node'],
      ['Source', 'ADS1115 (I2C)'],
      ['Firmware version', 'v0.8.0'],
    ])
    expect(within(pageOf()).getByTestId('status-dot')).toHaveClass('bg-success')
    expect(pageOf().closest('.opacity-60')).toBeNull()
    expect(screen.queryByText(/no info/i)).not.toBeInTheDocument()
  })

  it('online without info: amber dot, Online, Unknown, identity rows em dashes, a muted note', async () => {
    await openDevice({ health: 'online' }, 'gps', /^gps/)

    expect(deviceRows()).toEqual([
      ['Status', 'Online'],
      ['Product', '—'],
      ['Source', '—'],
      ['Firmware version', 'Unknown'],
      ['Host serial', '—'],
      ['Manufacturer', '—'],
      ['Homepage', '—'],
    ])
    expect(within(pageOf()).getByTestId('status-dot')).toHaveClass('bg-warning')
    expect(screen.getByText(/no info/i)).toBeInTheDocument()
    expect(pageOf().closest('.opacity-60')).toBeNull()
  })

  it('offline with info: grey dot, Offline, last seen version, the whole page at 60% opacity', async () => {
    await openDevice({ info: { ...tankInfo, version: 'v0.1.0' }, health: 'offline' })

    expect(deviceRows().slice(0, 4)).toEqual([
      ['Status', 'Offline'],
      ['Product', 'Tank node'],
      ['Source', 'ADS1115 (I2C)'],
      ['Firmware version', 'offline, last seen v0.1.0'],
    ])
    expect(within(pageOf()).getByTestId('status-dot')).toHaveClass('bg-muted')
    expect(pageOf().closest('.opacity-60')).not.toBeNull()
  })

  it('a dev build: green dot, Online, dev', async () => {
    await openDevice({ info: { ...tankInfo, version: 'dev' }, health: 'online' })

    expect(deviceRows()[0]).toEqual(['Status', 'Online'])
    expect(deviceRows()[3]).toEqual(['Firmware version', 'dev'])
    expect(within(pageOf()).getByTestId('status-dot')).toHaveClass('bg-success')
  })

  it('info with no health: grey dot, Unknown, the version as published, not dimmed', async () => {
    await openDevice({ info: tankInfo })

    expect(deviceRows()[0]).toEqual(['Status', 'Unknown'])
    expect(deviceRows()[3]).toEqual(['Firmware version', 'v0.8.0'])
    expect(within(pageOf()).getByTestId('status-dot')).toHaveClass('bg-muted')
    expect(pageOf().closest('.opacity-60')).toBeNull()
  })
})

describe('Settings Node page: rows', () => {
  it('always shows Status, Product, Source, Firmware version, Host serial, Manufacturer, Homepage, in that order', async () => {
    await openDevice({ info: tankInfo, health: 'online' })

    expect(deviceRows().map(([label]) => label)).toEqual([
      'Status',
      'Product',
      'Source',
      'Firmware version',
      'Host serial',
      'Manufacturer',
      'Homepage',
    ])
  })

  it('shows the Host serial in full, and the homepage', async () => {
    await openDevice({ info: tankInfo, health: 'online' })

    const rows = Object.fromEntries(deviceRows())
    expect(rows['Host serial']).toBe(PI)
    expect(rows['Homepage']).toBe('https://github.com/renewvan/node-tank')
  })

  it('reads Manufacturer as renewvan only when info exists without one', async () => {
    await openDevice({ info: tankInfo, health: 'online' })
    expect(Object.fromEntries(deviceRows())['Manufacturer']).toBe('renewvan')
  })

  it('shows the manufacturer the Node reports', async () => {
    await openDevice({ info: { ...tankInfo, manufacturer: 'Acme' }, health: 'online' })
    expect(Object.fromEntries(deviceRows())['Manufacturer']).toBe('Acme')
  })

  it('shows an em dash for each optional value the Node leaves out, never hiding the row', async () => {
    const { homepage: _h, host_serial: _s, ...bare } = tankInfo
    await openDevice({ info: bare, health: 'online' })

    const rows = Object.fromEntries(deviceRows())
    expect(rows['Host serial']).toBe('—')
    expect(rows['Homepage']).toBe('—')
  })

  it('leaves the Host serial out of the compact Nodes list', async () => {
    const { user } = renderSettings({}, { bus: busWith({ info: tankInfo, health: 'online' }) })
    await openNodes(user)

    expect(screen.queryByText(PI)).not.toBeInTheDocument()
  })
})

describe('Settings Node page: navigation', () => {
  it('titles a Node page by its product, with a Back button named Nodes', async () => {
    await openDevice({ info: tankInfo, health: 'online' })

    expect(screen.getByRole('button', { name: 'Nodes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tank node' })).toBeInTheDocument()
  })

  it('labels a Node with no info by its key, and a fallback row by its old label', async () => {
    await openDevice({ health: 'online' }, 'gps', /^gps/)
    expect(screen.getByRole('heading', { name: 'gps' })).toBeInTheDocument()
  })

  it('walks back to the Nodes list from the Back button', async () => {
    const { user } = await openDevice({ info: tankInfo, health: 'online' })

    await user.click(screen.getByRole('button', { name: 'Nodes' }))

    expect(screen.getByRole('list', { name: 'Published nodes' })).toBeInTheDocument()
  })

  it('falls back to the Nodes list when ?node= names a Node that is not reported', () => {
    renderSettings(
      {},
      {
        bus: busWith({ info: tankInfo, health: 'online' }),
        url: '/?page=settings&view=node&node=nope',
      },
    )

    expect(screen.getByRole('list', { name: 'Published nodes' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Device' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nodes' })).toBeInTheDocument()
  })

  it('falls back to the Nodes list when view=node has no node at all', () => {
    renderSettings({}, { bus: busWith({ info: tankInfo }), url: '/?page=settings&view=node' })

    expect(screen.getByRole('list', { name: 'Published nodes' })).toBeInTheDocument()
  })

  it('opens a deep link to a reported Node, and to a fallback row', () => {
    renderSettings(
      {},
      {
        bus: busWith({ info: tankInfo, health: 'online' }),
        url: '/?page=settings&view=node&node=tank',
      },
    )
    expect(screen.getByRole('heading', { name: 'Tank node' })).toBeInTheDocument()
  })

  it('opens a fallback row by its domain key', () => {
    renderSettings(
      {},
      { bus: { gps: { '0': {} as never } }, url: '/?page=settings&view=node&node=domain%3Agps' },
    )
    expect(screen.getByRole('heading', { name: 'GPS' })).toBeInTheDocument()
    expect(deviceRows()[3]).toEqual(['Firmware version', 'Unknown'])
  })

  describe('as a drawer', () => {
    beforeEach(() => window.localStorage.setItem(STORAGE_KEY, 'drawer'))

    it('opens the Device page in the drawer, titled by the Node, and Back steps up to Nodes', async () => {
      const { user } = renderSettings({}, { bus: busWith({ info: tankInfo, health: 'online' }) })
      await openNodes(user)
      await user.click(
        await within(await screen.findByRole('dialog', { name: 'Nodes' })).findByRole('button', {
          name: /^Tank node/,
        }),
      )

      const device = await screen.findByRole('dialog', { name: 'Tank node' })
      expect(within(device).getByText('v0.8.0')).toBeInTheDocument()

      await user.click(within(device).getByRole('button', { name: 'Back' }))
      expect(await screen.findByRole('dialog', { name: 'Nodes' })).toBeInTheDocument()
    })
  })
})

describe('Settings Node page: entities', () => {
  it('lists the entities the Node publishes, and opens Tanks from its Publishes row', async () => {
    const { user } = await openDevice({ info: tankInfo, health: 'online' })

    await user.click(screen.getByRole('button', { name: /^Tanks/ }))

    expect(screen.getByRole('heading', { name: 'Tanks' })).toBeInTheDocument()
  })
})
