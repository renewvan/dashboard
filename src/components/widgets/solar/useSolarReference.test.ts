import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { MIN_REFERENCE_W } from './solarView'
import { useSolarReference } from './useSolarReference'

describe('useSolarReference', () => {
  it('starts at the floor with no reading', () => {
    const { result } = renderHook(() => useSolarReference(undefined))
    expect(result.current).toBe(MIN_REFERENCE_W)
  })

  it('rises to the highest reading seen and holds it while power falls', () => {
    const { result, rerender } = renderHook(({ w }) => useSolarReference(w), {
      initialProps: { w: 50 as number | undefined },
    })
    rerender({ w: 412 })
    expect(result.current).toBe(412)
    rerender({ w: 96 })
    expect(result.current).toBe(412)
    rerender({ w: undefined })
    expect(result.current).toBe(412)
  })

  it('does not drop below the floor on a faint reading', () => {
    const { result } = renderHook(() => useSolarReference(15))
    expect(result.current).toBe(MIN_REFERENCE_W)
  })
})
