import { describe, expect, it } from 'vite-plus/test'
import { brokerLink } from './brokerLink'

const NONE = {}

describe('brokerLink', () => {
  it('reads the endpoint and protocol out of the broker URL', () => {
    expect(brokerLink('ws://192.168.10.50:9001', NONE)).toEqual({
      endpoint: '192.168.10.50:9001',
      protocol: 'WebSocket',
      authenticated: false,
    })
    expect(brokerLink('wss://hub.example.com/mqtt', NONE)).toMatchObject({
      endpoint: 'hub.example.com',
      protocol: 'WebSocket (TLS)',
    })
  })

  it('keeps an IPv6 literal bracketed, as it is written with a port', () => {
    expect(brokerLink('ws://[fd12::1]:9001', NONE)?.endpoint).toBe('[fd12::1]:9001')
  })

  it('shows an unknown scheme as it is rather than calling it a WebSocket', () => {
    expect(brokerLink('mqtt://broker:1883', NONE)?.protocol).toBe('mqtt')
  })

  it('says a login exists when credentials are configured, without carrying them', () => {
    const link = brokerLink('ws://hub:9001', { username: 'dash', password: 's3cret' })
    expect(link?.authenticated).toBe(true)
    expect(JSON.stringify(link)).not.toContain('s3cret')
    expect(JSON.stringify(link)).not.toContain('dash')
    expect(brokerLink('ws://hub:9001', { username: 'dash' })?.authenticated).toBe(true)
    expect(brokerLink('ws://hub:9001', { password: 'x' })?.authenticated).toBe(true)
  })

  it('never lets credentials embedded in the URL reach the endpoint', () => {
    const link = brokerLink('ws://dash:s3cret@192.168.10.50:9001/mqtt?token=abc', NONE)
    expect(link).toEqual({
      endpoint: '192.168.10.50:9001',
      protocol: 'WebSocket',
      authenticated: true,
    })
    expect(JSON.stringify(link)).not.toMatch(/s3cret|dash|token|abc|mqtt/)
  })

  it('has no link while the broker is unconfigured or the URL does not parse', () => {
    expect(brokerLink(undefined, NONE)).toBeNull()
    expect(brokerLink('', NONE)).toBeNull()
    expect(brokerLink('not a url', NONE)).toBeNull()
  })
})
