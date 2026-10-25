import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import type { DialView } from './cockpit/dialView'
import { DialReadout } from './DialReadout'

afterEach(cleanup)

const VIEW: DialView = {
  label: 'Battery',
  pct: 78,
  color: '#000',
  sub: '13.20V / 164W',
  unitsStrong: true,
  faulted: false,
}

const draw = (view: DialView) => render(<DialReadout view={view} icon={<span />} size="focus" />)

describe('DialReadout time to go', () => {
  it('shows the runtime under the subline, as "<time> to go"', () => {
    draw({ ...VIEW, timeToGo: '9d 0h' })

    const togo = screen.getByTestId('dial-time-to-go')
    expect(togo).toHaveTextContent('9d 0h to go')
    // Under the V / W line, not above it.
    const sub = screen.getByText((_, el) => el?.textContent === '13.20V / 164W')
    expect(sub.compareDocumentPosition(togo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows nothing for a dial with no runtime, such as a tank', () => {
    draw(VIEW)
    expect(screen.queryByTestId('dial-time-to-go')).not.toBeInTheDocument()
  })

  it('shows no runtime on a faulted dial, whose subline is the fault reason', () => {
    draw({ ...VIEW, faulted: true, sub: 'Short circuit', timeToGo: '9d 0h' })
    expect(screen.queryByTestId('dial-time-to-go')).not.toBeInTheDocument()
  })
})
