import { describe, expect, it } from 'vite-plus/test'
import manifestText from '../../public/manifest.webmanifest?raw'

const manifest = JSON.parse(manifestText) as {
  scope: string
  shortcuts?: { name: string; url: string }[]
}

describe('web app manifest', () => {
  it('offers a "Wake hub" shortcut that opens the standalone wake page inside the app scope', () => {
    const wake = manifest.shortcuts?.find((shortcut) => shortcut.name === 'Wake hub')
    expect(wake).toBeDefined()
    const url = new URL(wake!.url, 'https://hub.example/')
    expect(url.pathname.startsWith(manifest.scope)).toBe(true)
    expect(url.searchParams.get('page')).toBe('wake')
  })
})
