import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useUrlParam } from './useUrlParam'

const VALID = ['cellular', 'hub'] as const

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

function renderAt(url: string) {
  window.history.replaceState(null, '', url)
  return renderHook(() => useUrlParam('view', VALID))
}

describe('useUrlParam', () => {
  it('reads a valid value from the URL', () => {
    const { result } = renderAt('/?page=settings&view=hub')
    expect(result.current[0]).toBe('hub')
  })

  it.each([
    ['missing', '/?page=settings'],
    ['unknown', '/?page=settings&view=bogus'],
  ])('reads null when the param is %s', (_name, url) => {
    const { result } = renderAt(url)
    expect(result.current[0]).toBeNull()
  })

  it('pushes one history entry per write and keeps the other params', () => {
    const { result } = renderAt('/?page=settings')
    const before = window.history.length

    act(() => result.current[1]('cellular'))

    expect(result.current[0]).toBe('cellular')
    expect(window.location.search).toBe('?page=settings&view=cellular')
    expect(window.history.length).toBe(before + 1)
  })

  it('removes the param when written null', () => {
    const { result } = renderAt('/?page=settings&view=hub')

    act(() => result.current[1](null))

    expect(result.current[0]).toBeNull()
    expect(window.location.search).toBe('?page=settings')
  })

  it('does not push when the value is unchanged', () => {
    const { result } = renderAt('/?page=settings&view=hub')
    const before = window.history.length

    act(() => result.current[1]('hub'))
    act(() => result.current[1]('hub'))

    expect(window.history.length).toBe(before)
  })

  it('follows Back and Forward', async () => {
    const { result } = renderAt('/?page=settings')
    act(() => result.current[1]('cellular'))
    act(() => result.current[1]('hub'))

    act(() => window.history.back())
    await waitFor(() => expect(result.current[0]).toBe('cellular'))

    act(() => window.history.forward())
    await waitFor(() => expect(result.current[0]).toBe('hub'))
  })

  it('picks up a push made by another writer while mounted', () => {
    const first = renderAt('/?page=settings')
    const second = renderHook(() => useUrlParam('view', VALID))

    act(() => second.result.current[1]('hub'))

    expect(first.result.current[0]).toBe('hub')
  })
})
