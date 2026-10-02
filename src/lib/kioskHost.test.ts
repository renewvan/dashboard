import { describe, expect, it } from 'vitest'
import { isLocalKiosk } from './kioskHost'

describe('isLocalKiosk', () => {
  it('is true for the physical kiosk (hub/bin/deploy.sh launches Chromium at http://localhost)', () => {
    expect(isLocalKiosk('localhost')).toBe(true)
  })

  it('is true for the 127.0.0.1 loopback form', () => {
    expect(isLocalKiosk('127.0.0.1')).toBe(true)
  })

  it('is false for a Tailscale hostname (remote phone/laptop)', () => {
    expect(isLocalKiosk('renewvan-pi.tailnet-1234.ts.net')).toBe(false)
  })

  it('is false for a bare LAN IP (remote device on the same wifi)', () => {
    expect(isLocalKiosk('192.168.1.42')).toBe(false)
  })
})
