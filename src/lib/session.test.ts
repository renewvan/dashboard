import { describe, expect, it, vi } from 'vite-plus/test'
import { isSignedOut, loginUrl, safeNext } from './session'

const answer = (status: number) => vi.fn().mockResolvedValue({ status }) as unknown as typeof fetch

describe('isSignedOut', () => {
  it('is true only for a 401', async () => {
    expect(await isSignedOut(answer(401))).toBe(true)
    expect(await isSignedOut(answer(204))).toBe(false)
  })

  it('treats the kiosk / dev SPA fallback (200 index.html) as signed in', async () => {
    expect(await isSignedOut(answer(200))).toBe(false)
    expect(await isSignedOut(answer(404))).toBe(false)
  })

  it('never locks the page out when the hub cannot be reached', async () => {
    const down = vi.fn().mockRejectedValue(new TypeError('network')) as unknown as typeof fetch
    expect(await isSignedOut(down)).toBe(false)
  })
})

describe('safeNext', () => {
  it('keeps a path on this site', () => {
    expect(safeNext('/relays')).toBe('/relays')
    expect(safeNext('/?page=wake')).toBe('/?page=wake')
  })

  it.each([null, '', 'relays', '//evil.test', 'https://evil.test', '/login', '/login?next=/'])(
    'falls back to the home page for %s',
    (raw) => {
      expect(safeNext(raw)).toBe('/')
    },
  )
})

describe('loginUrl', () => {
  it('carries the destination, encoded', () => {
    expect(loginUrl('/relays?x=1')).toBe('/login?next=%2Frelays%3Fx%3D1')
  })
})
