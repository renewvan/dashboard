import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import type { TemperatureSensor } from '@/types'
import { EntityIconsContext } from '@/hooks/useEntityIcon'
import { TemperaturePage } from './TemperaturePage'

const KIOSK_WIDTH = 800
const JUST_BELOW_KIOSK_WIDTH = 799

const INDOOR: TemperatureSensor = {
  name: 'Indoor',
  unit: 'C',
  source: 'w1',
  temperature_c: 21.4,
  status: 'ok',
}
const OUTDOOR: TemperatureSensor = {
  name: 'Outdoor',
  unit: 'C',
  source: 'w1',
  temperature_c: -3.2,
  status: 'ok',
}
const LOST: TemperatureSensor = {
  name: 'Fridge',
  unit: 'C',
  source: 'w1',
  temperature_c: 4,
  status: 'disconnected',
}

let viewport: MatchMediaStub
function renderAt(
  width: number,
  temperatures: Record<string, TemperatureSensor> = {},
  onOpenTemperature?: (id: string) => void,
  entityIcons: Record<string, string> = {},
) {
  viewport = stubMatchMedia(width)
  return render(
    <EntityIconsContext.Provider value={entityIcons}>
      <TemperaturePage temperatures={temperatures} onOpenTemperature={onOpenTemperature} />
    </EntityIconsContext.Provider>,
  )
}

afterEach(() => {
  cleanup()
  viewport.restore()
  window.history.replaceState(null, '', '/')
})

describe('TemperaturePage', () => {
  it('lists every sensor, coldest first', () => {
    renderAt(KIOSK_WIDTH, { indoor: INDOOR, outdoor: OUTDOOR, fridge: LOST })
    expect(screen.getAllByText(/^(Outdoor|Indoor|Fridge)$/).map((el) => el.textContent)).toEqual([
      'Outdoor',
      'Indoor',
      'Fridge',
    ])
  })

  it('shows whole °C, and no reading for a sensor that is not ok', () => {
    renderAt(KIOSK_WIDTH, { indoor: INDOOR, outdoor: OUTDOOR, fridge: LOST })
    expect(screen.getByText('21°')).toBeInTheDocument()
    expect(screen.getByText('-3°')).toBeInTheDocument()
    expect(screen.getByText('--°')).toBeInTheDocument()
    expect(screen.getByText('No reading')).toBeInTheDocument()
  })

  it('says so when no sensor has been found', () => {
    renderAt(KIOSK_WIDTH)
    expect(screen.getByText('No temperature sensors yet.')).toBeInTheDocument()
  })
})

describe('TemperaturePage probe icon', () => {
  it('draws the icon picked for a probe on its thermometer, else the thermometer', () => {
    const { container } = renderAt(KIOSK_WIDTH, { outdoor: OUTDOOR, indoor: INDOOR }, undefined, {
      'temperature/outdoor': 'Refrigerator',
    })

    expect(container.querySelectorAll('.lucide-refrigerator')).toHaveLength(1)
    expect(container.querySelectorAll('.lucide-thermometer').length).toBeGreaterThanOrEqual(1)
  })
})

describe('TemperaturePage thermometers', () => {
  it.each([KIOSK_WIDTH, JUST_BELOW_KIOSK_WIDTH])(
    'opens the sensor in Settings when its thermometer is tapped at %ipx',
    async (width) => {
      const user = userEvent.setup()
      const onOpen = vi.fn()
      renderAt(width, { indoor: INDOOR, outdoor: OUTDOOR }, onOpen)
      await user.click(screen.getByRole('button', { name: `${OUTDOOR.name} settings` }))
      expect(onOpen).toHaveBeenCalledWith('outdoor')
    },
  )
})
