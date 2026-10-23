import { describe, expect, it } from 'vite-plus/test'
import { instanceLabel, ownerName } from './instances'

const drivers = [
  { key: 'venus', name: 'Venus' },
  { key: 'wattcycle', name: 'WattCycle' },
]

describe('instanceLabel', () => {
  it('is the instance name when it has one', () => {
    expect(instanceLabel('512', { name: 'House bank', driver: 'venus' }, drivers)).toBe(
      'House bank',
    )
  })

  it("is the owning Driver's name and the id without a name", () => {
    expect(instanceLabel('512', { driver: 'venus' }, drivers)).toBe('Venus · 512')
  })

  it('is the id alone for a legacy instance naming no Driver', () => {
    expect(instanceLabel('512', {}, drivers)).toBe('512')
  })

  it('treats an empty name as no name', () => {
    expect(instanceLabel('512', { name: '' }, drivers)).toBe('512')
  })

  it('uses the raw key of a Driver that is not on the bus', () => {
    expect(instanceLabel('512', { driver: 'ghost' }, drivers)).toBe('ghost · 512')
  })
})

describe('ownerName', () => {
  it('resolves the Driver by key, or is undefined for a legacy instance', () => {
    expect(ownerName({ driver: 'wattcycle' }, drivers)).toBe('WattCycle')
    expect(ownerName({}, drivers)).toBeUndefined()
  })
})
