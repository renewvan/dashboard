import { describe, expect, it } from 'vite-plus/test'
import { panelsFor } from './relayPanels'

const g = (...names: string[]) => names
const LIST = g('Lights', 'Appliances', 'USB')

describe('panelsFor', () => {
  it('puts every channel in Unassigned while nothing is assigned', () => {
    expect(panelsFor(['relay_02', 'relay_01'], {}, LIST)).toMatchObject([
      { title: 'Unassigned', ids: ['relay_01', 'relay_02'] },
    ])
  })

  it('files a channel under the group the bus holds for it', () => {
    const panels = panelsFor(
      ['relay_01', 'relay_02', 'relay_03'],
      { relay_01: 'Lights', relay_03: 'Lights', relay_02: 'USB' },
      LIST,
    )

    expect(panels.map((p) => [p.title, p.ids])).toEqual([
      ['Lights', ['relay_01', 'relay_03']],
      ['USB', ['relay_02']],
    ])
  })

  it('keeps a channel with no group visible, last, so a new relay always appears', () => {
    const panels = panelsFor(['relay_01', 'relay_02'], { relay_02: 'Lights' }, LIST)

    expect(panels.map((p) => p.title)).toEqual(['Lights', 'Unassigned'])
    expect(panels[1].ids).toEqual(['relay_01'])
  })

  it('runs the panels in the order of the list, whatever the order of the relays', () => {
    const assignments = { a: 'USB', b: 'Lights', c: 'Appliances' }

    expect(panelsFor(['a', 'b', 'c'], assignments, LIST).map((p) => p.title)).toEqual([
      'Lights',
      'Appliances',
      'USB',
    ])
    expect(
      panelsFor(['a', 'b', 'c'], assignments, g('USB', 'Appliances', 'Lights')).map((p) => p.title),
    ).toEqual(['USB', 'Appliances', 'Lights'])
  })

  it('draws Unassigned wherever its entry sits in the list', () => {
    const assignments = { a: 'Lights' }

    expect(
      panelsFor(['a', 'b'], assignments, g('Unassigned', 'Lights', 'USB')).map((p) => p.title),
    ).toEqual(['Unassigned', 'Lights'])
    expect(
      panelsFor(['a', 'b'], assignments, g('Lights', 'Unassigned', 'USB')).map((p) => p.title),
    ).toEqual(['Lights', 'Unassigned'])
  })

  it('reads a group that is no longer in the list as Unassigned', () => {
    const panels = panelsFor(
      ['relay_01', 'relay_02'],
      { relay_01: 'Lights', relay_02: 'Gone' },
      LIST,
    )

    expect(panels.map((p) => [p.title, p.ids])).toEqual([
      ['Lights', ['relay_01']],
      ['Unassigned', ['relay_02']],
    ])
  })

  it('does not treat an assignment to Unassigned as a group of its own', () => {
    const panels = panelsFor(['a'], { a: 'Unassigned' }, LIST)

    expect(panels.map((p) => p.title)).toEqual(['Unassigned'])
  })

  it('sorts a panel numerically, so relay_9 comes before relay_10', () => {
    const panels = panelsFor(
      ['relay_10', 'relay_9'],
      { relay_10: 'Lights', relay_9: 'Lights' },
      LIST,
    )

    expect(panels[0].ids).toEqual(['relay_9', 'relay_10'])
  })

  it('ignores an entry for a relay that is not on the bus, and drops a group left empty', () => {
    const panels = panelsFor(['relay_01'], { relay_01: 'Lights', relay_99: 'USB' }, LIST)

    expect(panels.map((p) => p.title)).toEqual(['Lights'])
  })

  it('does not read an inherited property as a group', () => {
    expect(panelsFor(['constructor'], {}, LIST).map((p) => p.title)).toEqual(['Unassigned'])
  })

  it('orders a card by the shared relay order, then the rest by id', () => {
    const assignments = { r_1: 'Lights', r_2: 'Lights', r_3: 'Lights', r_4: 'USB' }

    const panels = panelsFor(['r_1', 'r_2', 'r_3', 'r_4'], assignments, LIST, ['r_3', 'r_4', 'r_1'])

    expect(panels.map((p) => [p.title, p.ids])).toEqual([
      ['Lights', ['r_3', 'r_1', 'r_2']],
      ['USB', ['r_4']],
    ])
  })

  it('orders Unassigned by the shared relay order too', () => {
    expect(panelsFor(['r_1', 'r_2'], {}, LIST, ['r_2'])[0].ids).toEqual(['r_2', 'r_1'])
  })
})
