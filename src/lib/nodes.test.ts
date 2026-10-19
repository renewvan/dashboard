import { describe, expect, it } from 'vite-plus/test'
import { emptyRenewvanBusState, type NodeInfo, type RenewvanBusState } from '@/types'
import { nodeRows, nodesSummary } from './nodes'

function stateWith(partial: Partial<RenewvanBusState>): RenewvanBusState {
  return { ...emptyRenewvanBusState, ...partial }
}

const tankInfo: NodeInfo = {
  node: 'tank',
  product: 'Tank node',
  source: 'ADS1115 (I2C)',
  publishes: ['tank'],
  version: 'v0.8.0',
}

describe('nodeRows', () => {
  it('is empty before anything has published', () => {
    expect(nodeRows(emptyRenewvanBusState)).toEqual([])
  })

  it('makes one row per Node, however many entity types it publishes', () => {
    const rows = nodeRows(
      stateWith({
        nodes: {
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
        batteries: { '288': {} as never },
        solar: { '289': {} as never },
        chargers: { '290': {} as never, '291': {} as never },
      }),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      key: 'venus',
      label: 'Venus OS bridge',
      version: 'v0.3.0',
      entityCount: 4,
    })
  })

  it('joins entities to a Node by the entity types it publishes', () => {
    const [row] = nodeRows(
      stateWith({
        nodes: { tank: { info: tankInfo, health: 'online' } },
        tanks: { fresh: {} as never, grey: {} as never },
        gps: { '0': {} as never },
      }),
    )
    expect(row.key).toBe('tank')
    expect(row.entityCount).toBe(2)
  })

  describe('the five states of a Node', () => {
    const row = (nodes: RenewvanBusState['nodes']) => nodeRows(stateWith({ nodes }))[0]

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
    it('gives entities no Node claims a row by entity type, labelled as before, version Unknown', () => {
      const rows = nodeRows(stateWith({ tanks: { fresh: {} as never }, gps: { '0': {} as never } }))
      expect(rows).toEqual([
        expect.objectContaining({
          key: 'domain:tank',
          label: 'Tanks',
          version: 'Unknown',
          status: 'Unknown',
          entityCount: 1,
        }),
        expect.objectContaining({
          key: 'domain:gps',
          label: 'GPS',
          version: 'Unknown',
          entityCount: 1,
        }),
      ])
    })

    it('omits the fallback row once a Node claims that entity type', () => {
      const rows = nodeRows(
        stateWith({ nodes: { tank: { info: tankInfo } }, tanks: { fresh: {} as never } }),
      )
      expect(rows.map((r) => r.key)).toEqual(['tank'])
    })

    it('keeps a fallback row for an entity type the Node did not claim', () => {
      const rows = nodeRows(
        stateWith({
          nodes: { tank: { info: tankInfo } },
          tanks: { fresh: {} as never },
          gps: { '0': {} as never },
        }),
      )
      expect(rows.map((r) => r.key)).toEqual(['tank', 'domain:gps'])
    })

    it('does not create a row for an entity type with no entities', () => {
      expect(nodeRows(stateWith({ nodes: {} }))).toEqual([])
    })

    it('does not treat a health-only Node as claiming anything (no publishes known)', () => {
      const rows = nodeRows(
        stateWith({ nodes: { tank: { health: 'online' } }, tanks: { fresh: {} as never } }),
      )
      expect(rows.map((r) => r.key)).toEqual(['tank', 'domain:tank'])
    })

    it('does not know how many entities a Node with no info publishes, so it counts none', () => {
      const [health] = nodeRows(
        stateWith({ nodes: { tank: { health: 'online' } }, tanks: { fresh: {} as never } }),
      )
      expect(health.entityCount).toBeNull()
    })
  })

  it('labels a Node by its product, and a Node with no info by its key', () => {
    const rows = nodeRows(
      stateWith({ nodes: { tank: { info: tankInfo }, mystery: { health: 'online' } } }),
    )
    // Sorted by key, so `mystery` precedes `tank`.
    expect(rows.map((r) => [r.key, r.label])).toEqual([
      ['mystery', 'mystery'],
      ['tank', 'Tank node'],
    ])
  })

  it('lists Nodes in a stable order: by key, then fallback rows in the old display order', () => {
    const rows = nodeRows(
      stateWith({
        nodes: { venus: { health: 'online' }, tank: { health: 'online' } },
        tilt: { '0': {} as never },
        tanks: { fresh: {} as never },
      }),
    )
    expect(rows.map((r) => r.key)).toEqual(['tank', 'venus', 'domain:tank', 'domain:tilt'])
  })
})

describe('nodesSummary', () => {
  it('pluralises and handles none', () => {
    const row = (key: string) => ({ key }) as never
    expect(nodesSummary([])).toBe('No nodes connected')
    expect(nodesSummary([row('tank')])).toBe('1 node')
    expect(nodesSummary([row('tank'), row('gps')])).toBe('2 nodes')
  })
})
