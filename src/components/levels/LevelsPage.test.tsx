import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import type { Tank, TemperatureSensor } from '@/types'
import { LevelsPage } from './LevelsPage'

const KIOSK_WIDTH = 800
const JUST_BELOW_KIOSK_WIDTH = 799

const FRESH: Tank = {
  fluid_type: 'fresh_water',
  capacity_l: 100,
  level_pct: 62,
  status: 'ok',
  volume_since_full_l: 0,
  volume_since_empty_l: 0,
}
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
) {
  viewport = stubMatchMedia(width)
  return render(
    <LevelsPage
      tanks={{ fresh: FRESH }}
      temperatures={temperatures}
      onConfigure={vi.fn()}
      onOpenTemperature={onOpenTemperature}
    />,
  )
}

afterEach(() => {
  cleanup()
  viewport.restore()
  window.history.replaceState(null, '', '/')
})

describe('LevelsPage toggle', () => {
  it('opens on Tank levels and switches to every temperature sensor and back', async () => {
    const user = userEvent.setup()
    renderAt(KIOSK_WIDTH, { indoor: INDOOR, outdoor: OUTDOOR, fridge: LOST })
    expect(screen.getByText('Fresh water')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Temperature' }))
    expect(screen.queryByText('Fresh water')).not.toBeInTheDocument()
    expect(screen.getAllByText(/^(Outdoor|Indoor|Fridge)$/).map((el) => el.textContent)).toEqual([
      'Outdoor',
      'Indoor',
      'Fridge',
    ])

    await user.click(screen.getByRole('button', { name: 'Tank levels' }))
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
  })

  it('shows whole °C, and no reading for a sensor that is not ok', async () => {
    const user = userEvent.setup()
    renderAt(KIOSK_WIDTH, { indoor: INDOOR, outdoor: OUTDOOR, fridge: LOST })
    await user.click(screen.getByRole('button', { name: 'Temperature' }))
    expect(screen.getByText('21°')).toBeInTheDocument()
    expect(screen.getByText('-3°')).toBeInTheDocument()
    expect(screen.getByText('--°')).toBeInTheDocument()
    expect(screen.getByText('No reading')).toBeInTheDocument()
  })

  it('says so when no sensor has been found', async () => {
    const user = userEvent.setup()
    renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('button', { name: 'Temperature' }))
    expect(screen.getByText('No temperature sensors yet.')).toBeInTheDocument()
  })
})

describe('LevelsPage toggle spacing', () => {
  const wrapper = () => screen.getByRole('radiogroup', { name: 'Levels' }).parentElement

  it('has no top padding on the kiosk, where the header already spaces it', () => {
    renderAt(KIOSK_WIDTH)
    expect(wrapper()).toHaveClass('pb-3')
    expect(wrapper()).not.toHaveClass('pt-3')
  })

  it('keeps 12px above the pill on the phone so it never touches the header', () => {
    renderAt(JUST_BELOW_KIOSK_WIDTH)
    expect(wrapper()).toHaveClass('pt-3', 'pb-3')
  })

  it('is the compact pill: 4px inset, 6px segment padding', () => {
    renderAt(KIOSK_WIDTH)
    expect(screen.getByRole('radiogroup', { name: 'Levels' })).toHaveClass(
      'rounded-full',
      'p-1',
      'gap-1',
    )
    expect(screen.getByRole('button', { name: 'Tank levels' })).toHaveClass('py-1.5', 'px-4')
  })

  it('leaves the same 12px between the pill and the first card on the phone, tanks or temperature', async () => {
    const user = userEvent.setup()
    renderAt(JUST_BELOW_KIOSK_WIDTH, { indoor: INDOOR })
    const toggle = wrapper()!
    const tankList = toggle.nextElementSibling as HTMLElement
    expect(tankList).not.toHaveClass('pt-3')

    await user.click(screen.getByRole('button', { name: 'Temperature' }))
    expect(wrapper()!.nextElementSibling).not.toHaveClass('pt-3')
  })
})

describe('LevelsPage thermometers', () => {
  it.each([KIOSK_WIDTH, JUST_BELOW_KIOSK_WIDTH])(
    'opens the sensor in Settings when its thermometer is tapped at %ipx',
    async (width) => {
      const user = userEvent.setup()
      const onOpen = vi.fn()
      renderAt(width, { indoor: INDOOR, outdoor: OUTDOOR }, onOpen)
      await user.click(screen.getByRole('button', { name: 'Temperature' }))
      await user.click(screen.getByRole('button', { name: `${OUTDOOR.name} settings` }))
      expect(onOpen).toHaveBeenCalledWith('outdoor')
    },
  )
})
