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
  it('takes the host out of the broker URL, without scheme or port', () => {
    expect(hubAddress('ws://192.168.1.10:9001')).toEqual({ host: '192.168.1.10', route: 'local' })
    expect(hubAddress('wss://hub.example.com/mqtt')).toEqual({
      host: 'hub.example.com',
      route: 'remote',
    })
  })

  it('shows an IPv6 literal without its brackets', () => {
    expect(hubAddress('ws://[::1]:9001')).toEqual({ host: '::1', route: 'local' })
  })

  it('has no address while the broker is unconfigured or the URL does not parse', () => {
    expect(hubAddress(undefined)).toBeNull()
    expect(hubAddress('')).toBeNull()
    expect(hubAddress('not a url')).toBeNull()
  })
})
