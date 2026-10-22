import { describe, expect, it } from 'vite-plus/test'
import type { TailscaleStatus } from '@/hooks/useRenewvanBus'
import {
  tailscaleDaemonText,
  tailscaleEndpoints,
  tailscalePeersText,
  tailscaleStatusText,
} from './tailscale'

const UP: TailscaleStatus = {
  enabled: true,
  connected: true,
  ip: '100.64.0.1',
  hostname: 'renewvan',
  peers: 2,
}
const NEEDS_LOGIN: TailscaleStatus = { ...UP, connected: false, ip: null, hostname: null, peers: 0 }
const ABSENT: TailscaleStatus = { ...NEEDS_LOGIN, enabled: false }

describe('tailscaleStatusText', () => {
  it('is the address once connected, and says why when it is not', () => {
    expect(tailscaleStatusText(UP)).toBe('100.64.0.1')
    expect(tailscaleStatusText({ ...UP, ip: null })).toBe('Connected')
    expect(tailscaleStatusText(NEEDS_LOGIN)).toBe('Not authenticated')
    expect(tailscaleStatusText(ABSENT)).toBe('Not installed')
    expect(tailscaleStatusText(null)).toBe('Loading…')
  })
})

describe('tailscaleDaemonText', () => {
  it('tells the three states of the daemon apart', () => {
    expect(tailscaleDaemonText(UP)).toBe('Connected')
    expect(tailscaleDaemonText(NEEDS_LOGIN)).toBe('Needs login')
    expect(tailscaleDaemonText(ABSENT)).toBe('Not installed')
  })

  it('has no state to report before the status arrives', () => {
    expect(tailscaleDaemonText(null)).toBeNull()
  })
})

describe('tailscalePeersText', () => {
  it('counts the peers online', () => {
    expect(tailscalePeersText(0)).toBe('No peers online')
    expect(tailscalePeersText(1)).toBe('1 peer online')
    expect(tailscalePeersText(5)).toBe('5 peers online')
  })
})

describe('tailscaleEndpoints', () => {
  it('lists where the dashboard and the broker answer over the tailnet', () => {
    expect(tailscaleEndpoints(UP)).toEqual([
      { label: 'Dashboard', value: 'http://100.64.0.1' },
      { label: 'MQTT', value: '100.64.0.1:1883' },
    ])
  })

  it('lists nothing without an address, rather than a dead link', () => {
    expect(tailscaleEndpoints(null)).toEqual([])
    expect(tailscaleEndpoints(NEEDS_LOGIN)).toEqual([])
    expect(tailscaleEndpoints({ ...UP, ip: null })).toEqual([])
    // A stale address while not connected must not be offered either.
    expect(tailscaleEndpoints({ ...UP, connected: false })).toEqual([])
  })
})
