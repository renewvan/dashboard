import { describe, expect, it } from 'vite-plus/test'
import { resolveBrokerUrl } from './runtimeEnv'

describe('resolveBrokerUrl', () => {
  it('turns a path into a ws URL on the page host, port included', () => {
    expect(resolveBrokerUrl('/mqtt', { protocol: 'http:', host: '192.168.10.111' })).toBe(
      'ws://192.168.10.111/mqtt',
    )
    expect(resolveBrokerUrl('/mqtt', { protocol: 'http:', host: 'localhost:8080' })).toBe(
      'ws://localhost:8080/mqtt',
    )
  })

  it('uses wss when the page itself is served over TLS', () => {
    expect(resolveBrokerUrl('/mqtt', { protocol: 'https:', host: 'hub.example' })).toBe(
      'wss://hub.example/mqtt',
    )
  })

  it('leaves a full broker URL and an unset value alone', () => {
    const at = { protocol: 'http:', host: '192.168.10.111' }
    expect(resolveBrokerUrl('ws://192.168.10.111:9001', at)).toBe('ws://192.168.10.111:9001')
    expect(resolveBrokerUrl('', at)).toBe('')
    expect(resolveBrokerUrl(undefined, at)).toBeUndefined()
  })
})
