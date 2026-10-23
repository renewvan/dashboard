import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { useVan } from './useVan'

const STORAGE_KEY = 'renewvan-dashboard-van'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useVan', () => {
  it('starts with every field empty on a fresh kiosk', () => {
    const { result } = renderHook(() => useVan())
    expect(result.current[0]).toEqual({ name: '', brand: '', model: '', kms: '', plate: '' })
  })

  it('changes one field and keeps the others', () => {
    const { result } = renderHook(() => useVan())
    act(() => result.current[1]('name', 'Bluey'))
    act(() => result.current[1]('plate', '1234 ABC'))

    expect(result.current[0]).toMatchObject({ name: 'Bluey', plate: '1234 ABC', brand: '' })
  })

  it('persists the details across remounts', () => {
    const first = renderHook(() => useVan())
    act(() => first.result.current[1]('model', 'Ducato'))
    first.unmount()

    const second = renderHook(() => useVan())
    expect(second.result.current[0].model).toBe('Ducato')
  })

  it('reads corrupt storage as empty rather than breaking Settings', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    const { result } = renderHook(() => useVan())
    expect(result.current[0].name).toBe('')
  })

  it('keeps the valid fields when another one has the wrong type', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'Bluey', kms: 120000 }))
    const { result } = renderHook(() => useVan())
    expect(result.current[0]).toMatchObject({ name: 'Bluey', kms: '' })
  })
})
