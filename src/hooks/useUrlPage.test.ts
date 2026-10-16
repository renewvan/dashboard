import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { useUrlPage } from './useUrlPage'

const IDS = ['start', 'power', 'settings']

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

function renderAt(url: string) {
  window.history.replaceState(null, '', url)
  return renderHook(() => useUrlPage(IDS, 'start'))
}

describe('useUrlPage', () => {
  it('reads the page, falling back to the default for a missing or unknown one', () => {
    expect(renderAt('/?page=power').result.current[0]).toBe('power')
    expect(renderAt('/').result.current[0]).toBe('start')
    expect(renderAt('/?page=bogus').result.current[0]).toBe('start')
  })

  it('pushes one entry per setPage', () => {
    const { result } = renderAt('/')
    const before = window.history.length

    act(() => result.current[1]('power'))

    expect(result.current[0]).toBe('power')
    expect(window.location.search).toBe('?page=power')
    expect(window.history.length).toBe(before + 1)
  })

  it('keeps params the caller does not mention when the page changes', () => {
    const { result } = renderAt('/?page=settings&view=cellular&other=1')

    act(() => result.current[1]('power'))

    expect(window.location.search).toBe('?page=power&view=cellular&other=1')
  })

  it('removes the params the caller passes as null and keeps the rest', () => {
    const { result } = renderAt('/?page=settings&view=cellular&other=1')
    const before = window.history.length

    act(() => result.current[1]('power', { view: null }))

    expect(window.location.search).toBe('?page=power&other=1')
    expect(window.history.length).toBe(before + 1)
  })

  it('pushes nothing when the URL would not change', () => {
    const { result } = renderAt('/?page=power&other=1')
    const before = window.history.length

    act(() => result.current[1]('power'))
    act(() => result.current[1]('power', { view: null }))

    expect(window.location.search).toBe('?page=power&other=1')
    expect(window.history.length).toBe(before)
  })

  it('sets the page and extra params in a single push', () => {
    const { result } = renderAt('/?page=power')
    const before = window.history.length

    act(() => result.current[1]('settings', { view: 'cellular' }))

    expect(result.current[0]).toBe('settings')
    expect(new URLSearchParams(window.location.search).get('page')).toBe('settings')
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
