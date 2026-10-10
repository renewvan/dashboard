import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useUrlTab } from './useUrlTab'

const IDS = ['start', 'power', 'settings']

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

function renderAt(url: string) {
  window.history.replaceState(null, '', url)
  return renderHook(() => useUrlTab(IDS, 'start'))
}

describe('useUrlTab', () => {
  it('reads the tab, falling back to the default for a missing or unknown one', () => {
    expect(renderAt('/?tab=power').result.current[0]).toBe('power')
    expect(renderAt('/').result.current[0]).toBe('start')
    expect(renderAt('/?tab=bogus').result.current[0]).toBe('start')
  })

  it('pushes one entry per setTab', () => {
    const { result } = renderAt('/')
    const before = window.history.length

    act(() => result.current[1]('power'))

    expect(result.current[0]).toBe('power')
    expect(window.location.search).toBe('?tab=power')
    expect(window.history.length).toBe(before + 1)
  })

  it('keeps params the caller does not mention when the tab changes', () => {
    const { result } = renderAt('/?tab=settings&view=cellular&other=1')

    act(() => result.current[1]('power'))

    expect(window.location.search).toBe('?tab=power&view=cellular&other=1')
  })

  it('removes the params the caller passes as null and keeps the rest', () => {
    const { result } = renderAt('/?tab=settings&view=cellular&other=1')
    const before = window.history.length

    act(() => result.current[1]('power', { view: null }))

    expect(window.location.search).toBe('?tab=power&other=1')
    expect(window.history.length).toBe(before + 1)
  })

  it('pushes nothing when the URL would not change', () => {
    const { result } = renderAt('/?tab=power&other=1')
    const before = window.history.length

    act(() => result.current[1]('power'))
    act(() => result.current[1]('power', { view: null }))

    expect(window.location.search).toBe('?tab=power&other=1')
    expect(window.history.length).toBe(before)
  })

  it('sets the tab and extra params in a single push', () => {
    const { result } = renderAt('/?tab=power')
    const before = window.history.length

    act(() => result.current[1]('settings', { view: 'cellular' }))

    expect(result.current[0]).toBe('settings')
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('settings')
    expect(new URLSearchParams(window.location.search).get('view')).toBe('cellular')
    expect(window.history.length).toBe(before + 1)
  })

  it('follows popstate', async () => {
    const { result } = renderAt('/')
    act(() => result.current[1]('power'))

    act(() => window.history.back())

    await waitFor(() => expect(result.current[0]).toBe('start'))
  })
})
