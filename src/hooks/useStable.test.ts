import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { useContentStable, useShallowStable } from './useStable'

describe('useShallowStable', () => {
  it('keeps the reference while every field is the same', () => {
    const fn = () => {}
    const { result, rerender } = renderHook(({ v }) => useShallowStable(v), {
      initialProps: { v: { a: 1, fn } },
    })
    const first = result.current
    rerender({ v: { a: 1, fn } })
    expect(result.current).toBe(first)
  })

  it('returns the new object when a field changes or a key is added', () => {
    const { result, rerender } = renderHook(({ v }) => useShallowStable<object>(v), {
      initialProps: { v: { a: 1 } as object },
    })
    const first = result.current
    rerender({ v: { a: 2 } })
    expect(result.current).not.toBe(first)
    const second = result.current
    rerender({ v: { a: 2, b: undefined } })
    expect(result.current).not.toBe(second)
  })
})

describe('useContentStable', () => {
  it('keeps the reference while the content is equal', () => {
    const { result, rerender } = renderHook(({ v }) => useContentStable(v), {
      initialProps: { v: { sats: [1, 2] } },
    })
    const first = result.current
    rerender({ v: { sats: [1, 2] } })
    expect(result.current).toBe(first)
    rerender({ v: { sats: [1, 3] } })
    expect(result.current).not.toBe(first)
  })
})
