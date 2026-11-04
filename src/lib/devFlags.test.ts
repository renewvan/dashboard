import { afterEach, describe, expect, it } from 'vite-plus/test'
import { applyDevFlags, devFlagOn, readDevFlag } from './devFlags'

afterEach(() => {
  window.history.pushState({}, '', '/')
  window.localStorage.clear()
})

describe('dev flags', () => {
  it('writes stored settings under their storage key', () => {
    window.history.pushState({}, '', '/?flag.theme=dark&flag.navbar-position=bottom')
    applyDevFlags()
    expect(window.localStorage.getItem('renewvan-dashboard-theme')).toBe('dark')
    expect(window.localStorage.getItem('renewvan-dashboard-navbar-position')).toBe('bottom')
  })

  it('keeps session flags out of storage and ignores bad names', () => {
    window.history.pushState({}, '', '/?flag.demo=true&flag.nav-pinned=1&flag.A_b=x&other=1')
    applyDevFlags()
    expect(window.localStorage.length).toBe(0)
    expect(devFlagOn('demo')).toBe(true)
    expect(devFlagOn('nav-pinned')).toBe(true)
    expect(devFlagOn('heater-pause')).toBe(false)
    expect(readDevFlag('other')).toBeNull()
  })
})
