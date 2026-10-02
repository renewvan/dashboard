import { describe, expect, it } from 'vitest'
import { isLocalKiosk } from './kioskHost'

describe('isLocalKiosk', () => {
  it('is true when the kioskHost marker is present (the Pi\'s own Chromium — see labwc-autostart/deploy.sh)', () => {
    expect(isLocalKiosk('?kioskHost=1')).toBe(true)
  })

  it('is true when kioskHost=1 is alongside other query params (e.g. a deep link with ?tab=)', () => {
    expect(isLocalKiosk('?tab=power&kioskHost=1')).toBe(true)
  })

  it('is false with no query string at all', () => {
    expect(isLocalKiosk('')).toBe(false)
  })

  it('is false for an unrelated query string', () => {
    expect(isLocalKiosk('?tab=power')).toBe(false)
  })

  it('is false for kioskHost with any other value', () => {
    expect(isLocalKiosk('?kioskHost=0')).toBe(false)
    expect(isLocalKiosk('?kioskHost=true')).toBe(false)
  })

  it('regression: hostname alone must never grant local-kiosk status — a developer running the dashboard on their own machine (dev server, or an SSH tunnel onto localhost) is not the van\'s screen', () => {
    // isLocalKiosk only ever looks at the query string, so there is no
    // hostname branch left to accidentally match "localhost" here.
    expect(isLocalKiosk('')).toBe(false)
  })
})
