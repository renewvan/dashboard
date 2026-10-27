import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { useVan } from './useVan'

const STORAGE_KEY = 'renewvan-dashboard-van'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useVan', () => {
  it('keeps a valid hex colour and drops anything else', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ color: '#ef4444' }))
    expect(renderHook(() => useVan()).result.current[0].color).toBe('#ef4444')

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ color: 'red; x' }))
    expect(renderHook(() => useVan()).result.current[0].color).toBe('')
  })

  it('starts with every field empty on a fresh kiosk', () => {
    const { result } = renderHook(() => useVan())
    expect(result.current[0]).toEqual({
      name: '',
      brand: '',
      model: '',
      kms: '',
      plate: '',
      color: '',
    })
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
