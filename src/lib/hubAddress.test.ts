import { describe, expect, it } from 'vite-plus/test'
import { classifyHost, hubAddress } from './hubAddress'

describe('classifyHost', () => {
  it.each([
    ['192.168.1.10', 'local'],
    ['10.0.0.5', 'local'],
    ['172.16.0.1', 'local'],
    ['172.31.255.254', 'local'],
    ['127.0.0.1', 'local'],
    ['169.254.3.4', 'local'],
    ['localhost', 'local'],
    ['renewvan.local', 'local'],
  ])('reads %s as a local network address', (host, route) => {
    expect(classifyHost(host)).toBe(route)
  })

  it('keeps the private 172 block to 172.16–172.31', () => {
    expect(classifyHost('172.15.0.1')).toBe('remote')
    expect(classifyHost('172.32.0.1')).toBe('remote')
  })

  it.each([
    ['100.64.0.1', 'tailscale'],
    ['100.127.255.255', 'tailscale'],
    ['van.tail1234.ts.net', 'tailscale'],
  ])('reads %s as Tailscale', (host, route) => {
    expect(classifyHost(host)).toBe(route)
  })

  it('keeps the Tailscale range to 100.64–100.127', () => {
    expect(classifyHost('100.63.0.1')).toBe('remote')
    expect(classifyHost('100.128.0.1')).toBe('remote')
  })

  it('treats a public address or name as remote, and never as local by prefix alone', () => {
    expect(classifyHost('8.8.8.8')).toBe('remote')
    expect(classifyHost('hub.example.com')).toBe('remote')
    // A name that merely starts like a private range is a name, not an address.
    expect(classifyHost('192.168.1.10.example.com')).toBe('remote')
    expect(classifyHost('999.168.1.1')).toBe('remote')
  })

  it.each([
    ['::1', 'local'],
    ['fd12:3456::1', 'local'],
    ['fe80::1', 'local'],
    ['2001:db8::1', 'remote'],
    ['fec0::1', 'remote'],
  ])('reads the IPv6 address %s as %s', (host, route) => {
    expect(classifyHost(host)).toBe(route)
  })
})

describe('hubAddress', () => {
  it("shows the Pi's published address and takes the route from the broker", () => {
    expect(hubAddress({ ip: '192.168.10.50' }, 'ws://192.168.10.50:9001')).toEqual({
      host: '192.168.10.50',
      route: 'local',
    })
  })

  it('says Tailscale for a kiosk connected over it, while still showing the Pi LAN address', () => {
    // The Pi's own address is always its LAN one; only the broker the client reached says how.
    expect(hubAddress({ ip: '192.168.10.50' }, 'ws://100.115.137.59:9001')).toEqual({
      host: '192.168.10.50',
      route: 'tailscale',
    })
  })

  it('says remote for a kiosk reaching the hub over the internet', () => {
    expect(hubAddress({ ip: '192.168.10.50' }, 'wss://hub.example.com/mqtt')).toEqual({
      host: '192.168.10.50',
      route: 'remote',
    })
  })

  it('falls back to the broker host while the Pi has not published an address', () => {
    expect(hubAddress(null, 'ws://192.168.1.10:9001')).toEqual({
      host: '192.168.1.10',
      route: 'local',
    })
    expect(hubAddress({ ip: null }, 'ws://192.168.1.10:9001')).toEqual({
      host: '192.168.1.10',
      route: 'local',
    })
  })

  it('shows an IPv6 broker without its brackets', () => {
    expect(hubAddress(null, 'ws://[::1]:9001')).toEqual({ host: '::1', route: 'local' })
  })

  it('judges the route from the Pi address when no broker URL is configured', () => {
    expect(hubAddress({ ip: '192.168.10.50' }, undefined)).toEqual({
      host: '192.168.10.50',
      route: 'local',
    })
  })

  it('has no address while neither the Pi nor the broker is known', () => {
    expect(hubAddress(null, undefined)).toBeNull()
    expect(hubAddress({ ip: null }, '')).toBeNull()
    expect(hubAddress(null, 'not a url')).toBeNull()
  })
})
