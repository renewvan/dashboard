import { describe, expect, it } from 'vite-plus/test'
import { reorderedRelayOrder, sortByRelayOrder } from './relayOrder'

describe('sortByRelayOrder', () => {
  it('follows the order, then the relays it does not list, by id', () => {
    expect(sortByRelayOrder(['r_10', 'r_2', 'r_1', 'r_3'], ['r_3', 'r_1'])).toEqual([
      'r_3',
      'r_1',
      'r_2',
      'r_10',
    ])
  })

  it('sorts by id, numerically, when there is no order', () => {
    expect(sortByRelayOrder(['r_10', 'r_9'], [])).toEqual(['r_9', 'r_10'])
  })

  it('ignores an id in the order that is not on the bus, and a repeat', () => {
    expect(sortByRelayOrder(['a', 'b'], ['gone', 'b', 'b', 'a'])).toEqual(['b', 'a'])
  })
})

describe('reorderedRelayOrder', () => {
  const all = ['a', 'b', 'c', 'd', 'e']

  it('moves a relay inside its card and lists every relay on the bus', () => {
    expect(reorderedRelayOrder(all, [], ['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a', 'd', 'e'])
  })

  it('trades places only among the card, so the other cards keep their slots', () => {
    // The card holds a, c and e, which sit between b and d in the whole order.
    expect(reorderedRelayOrder(all, ['a', 'b', 'c', 'd', 'e'], ['a', 'c', 'e'], 2, 0)).toEqual([
      'e',
      'b',
      'a',
      'd',
      'c',
    ])
  })

  it('builds on the order that is already stored', () => {
    expect(reorderedRelayOrder(all, ['e', 'd', 'c', 'b', 'a'], ['c', 'b', 'a'], 0, 1)).toEqual([
      'e',
      'd',
      'b',
      'c',
      'a',
    ])
  })

  it('changes nothing for a move to the same place or out of range', () => {
    const same = ['a', 'b', 'c', 'd', 'e']
    expect(reorderedRelayOrder(all, [], ['a', 'b'], 1, 1)).toEqual(same)
    expect(reorderedRelayOrder(all, [], ['a', 'b'], 0, 2)).toEqual(same)
    expect(reorderedRelayOrder(all, [], ['a', 'b'], -1, 0)).toEqual(same)
  })

  it('does not change the arrays it is given', () => {
    const order = ['b', 'a']
    const card = ['b', 'a']
    reorderedRelayOrder(['a', 'b'], order, card, 0, 1)
    expect(order).toEqual(['b', 'a'])
    expect(card).toEqual(['b', 'a'])
  })
})
