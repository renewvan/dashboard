import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  appendAlertHistoryEntry,
  getAlertHistory,
  removeAlertHistoryEntries,
  subscribeAlertHistory,
} from './alertHistory'

const raise = (title: string) =>
  appendAlertHistoryEntry({ key: `tank:${title}`, type: 'error', title, description: '' })

beforeEach(() => {
  window.localStorage.clear()
})

describe('removeAlertHistoryEntries', () => {
  it('drops exactly the given entries and keeps the rest in their order', () => {
    const a = raise('A')
    const b = raise('B')
    const c = raise('C')
    const d = raise('D')

    removeAlertHistoryEntries([a, c])

    expect(getAlertHistory().map((entry) => entry.id)).toEqual([d, b])
  })

  it('notifies subscribers once for the whole batch', () => {
    const ids = [raise('A'), raise('B'), raise('C')]
    const listener = vi.fn()
    const unsubscribe = subscribeAlertHistory(listener)

    removeAlertHistoryEntries(ids)

    expect(listener).toHaveBeenCalledOnce()
    expect(getAlertHistory()).toEqual([])
    unsubscribe()
  })

  it('ignores ids that are not in the log', () => {
    const a = raise('A')

    removeAlertHistoryEntries(['gone'])

    expect(getAlertHistory().map((entry) => entry.id)).toEqual([a])
  })

  it('does nothing, and tells nobody, for an empty batch', () => {
    raise('A')
    const listener = vi.fn()
    const unsubscribe = subscribeAlertHistory(listener)

    removeAlertHistoryEntries([])

    expect(listener).not.toHaveBeenCalled()
    expect(getAlertHistory()).toHaveLength(1)
    unsubscribe()
  })
})
