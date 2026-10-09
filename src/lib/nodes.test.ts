import { describe, expect, it } from 'vitest'
import { emptyRenewvanBusState, type RenewvanBusState } from '@/types'
import { connectedNodes, nodesSummary } from './nodes'

function stateWith(partial: Partial<RenewvanBusState>): RenewvanBusState {
  return { ...emptyRenewvanBusState, ...partial }
}

describe('connectedNodes', () => {
  it('omits domains that have not published and counts entities per node', () => {
    const nodes = connectedNodes(
      stateWith({
        tanks: { fresh: {} as never, grey: {} as never },
        routers: { r1: {} as never },
      }),
    )
    expect(nodes).toEqual([
      { domain: 'tanks', label: 'Tanks', count: 2 },
      { domain: 'routers', label: 'Router', count: 1 },
    ])
  })

  it('is empty before anything has published', () => {
    expect(connectedNodes(emptyRenewvanBusState)).toEqual([])
  })
})

describe('nodesSummary', () => {
  it('pluralises and handles none', () => {
    expect(nodesSummary([])).toBe('No nodes connected')
    expect(nodesSummary([{ domain: 'tanks', label: 'Tanks', count: 1 }])).toBe('1 node')
    expect(
      nodesSummary([
        { domain: 'tanks', label: 'Tanks', count: 1 },
        { domain: 'gps', label: 'GPS', count: 1 },
      ]),
    ).toBe('2 nodes')
  })
})
