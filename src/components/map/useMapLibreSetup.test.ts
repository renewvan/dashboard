import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vite-plus/test'

// MapLibre loads its tile-parsing worker from a file of its own, by URL, at runtime, and the app
// hands Vite that file through a `?url` import (`useMapLibreSetup`). jsdom cannot run a map, so the
// other tests mock MapLibre and would stay green if a MapLibre upgrade moved or renamed the file:
// the build would then fail, or worse the map would ship blank with only "Worker failed to load"
// in the console. This fails first, with the reason in its name.
it('finds the MapLibre worker file at the path the app imports it from', () => {
  const pkgDir = dirname(createRequire(import.meta.url).resolve('maplibre-gl/package.json'))
  expect(existsSync(join(pkgDir, 'dist', 'maplibre-gl-worker.mjs'))).toBe(true)
})

// The Map page and the Start card each mount a map, and switching between them overlaps one
// leaving with one arriving. The protocol is global, so the first unmount must not remove it.
it('keeps the pmtiles protocol until the last map unmounts', async () => {
  vi.resetModules()
  const addProtocol = vi.fn()
  const removeProtocol = vi.fn()
  vi.doMock('maplibre-gl', () => ({ addProtocol, removeProtocol, setWorkerUrl: vi.fn() }))
  vi.doMock('maplibre-gl/dist/maplibre-gl-worker.mjs?url', () => ({ default: '/worker.mjs' }))
  const { useMapLibreSetup } = await import('./useMapLibreSetup')
  const a = renderHook(() => useMapLibreSetup())
  const b = renderHook(() => useMapLibreSetup())
  expect(addProtocol).toHaveBeenCalledTimes(1)
  a.unmount()
  expect(removeProtocol).not.toHaveBeenCalled()
  b.unmount()
  expect(removeProtocol).toHaveBeenCalledTimes(1)
})
