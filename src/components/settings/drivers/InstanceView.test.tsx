import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'
import type { Charger, RenewvanBusState, Solar } from '@/types'

const venus: RenewvanBusState['drivers'] = {
  venus: {
    health: 'online',
    info: {
      driver: 'venus',
      product: 'Venus OS bridge',
      source: 'Venus OS MQTT',
      publishes: ['solar', 'charger'],
      version: 'v0.5.0',
    },
  },
}

const roof: Solar = {
  driver: 'venus',
  power_w: 2,
  battery_voltage_v: 13.38,
  battery_current_a: 0.1,
  pv_voltage_v: 16.89,
  pv_current_a: 0.1,
  yield_today_wh: 140,
  yield_history_wh: [140, 1840, null, 0, 2300],
  charge_state: 'bulk',
}

const mains: Charger = { driver: 'venus', voltage_v: 13.8, current_a: 20, source: 'ac' }

function open(url: string, bus: Partial<RenewvanBusState> = {}) {
  return renderSettings(
    {},
    { url, bus: { drivers: venus, solar: { '291': roof }, chargers: { ip22: mains }, ...bus } },
  )
}

describe('Settings device page', () => {
  it('leads a solar controller with its state, yield and PV readings, then its battery side', () => {
    open('/?page=settings&view=instance&instance=solar:291')

    expect(screen.getByRole('heading', { name: 'Venus · 291' })).toBeInTheDocument()
    const readings = screen.getByLabelText('Venus · 291 readings')
    expect(
      Object.fromEntries(
        within(readings)
          .getAllByRole('term')
          .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
      ),
    ).toEqual({
      State: 'Bulk',
      'Yield today': '140Wh',
      Voltage: '16.89V',
      Current: '0.1A',
      'PV power': '2W',
    })
    const details = screen.getByLabelText('Venus · 291 details')
    expect(within(details).getByText('Battery').nextElementSibling).toHaveTextContent(
      '13.38 V · 0.1 A',
    )
    expect(within(details).getByText('Driver').nextElementSibling).toHaveTextContent('Venus')
  })

  it('shows a dash, never a number it does not have, for a controller still missing readings', () => {
    open('/?page=settings&view=instance&instance=solar:291', {
      solar: { '291': { power_w: 2, battery_voltage_v: 13.4 } },
    })

    const readings = screen.getByLabelText('291 readings')
    expect(within(readings).getByText('State').nextElementSibling).toHaveTextContent('—')
    expect(within(readings).getByText('Voltage').nextElementSibling).toHaveTextContent('—')
  })

  it('opens the daily harvest from the History row, and back returns to the device', async () => {
    const { user } = open('/?page=settings&view=instance&instance=solar:291')

    await user.click(screen.getByRole('button', { name: 'History' }))

    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument()
    const days = screen.getByLabelText('Daily yield')
    expect(
      within(days)
        .getAllByRole('term')
        .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
    ).toEqual([
      ['Today', '140 Wh'],
      ['Yesterday', '1.8 kWh'],
      [expect.any(String), '—'],
      [expect.any(String), '0 Wh'],
      [expect.any(String), '2.3 kWh'],
    ])

    await user.click(screen.getByRole('button', { name: /Venus · 291/ }))
    expect(screen.getByRole('heading', { name: 'Venus · 291' })).toBeInTheDocument()
  })

  it('says so when the controller has published no history', () => {
    open('/?page=settings&view=instance-history&instance=solar:291', {
      solar: { '291': { ...roof, yield_history_wh: undefined } },
    })

    expect(screen.getByText(/has not published its history yet/)).toBeInTheDocument()
  })

  it('has no History row for a charger, and a history link to one lands on its page', () => {
    open('/?page=settings&view=instance-history&instance=charger:ip22')

    expect(screen.getByRole('heading', { name: 'Venus · ip22' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'History' })).not.toBeInTheDocument()
  })

  it('falls back to Devices for an instance that is not on the bus', () => {
    open('/?page=settings&view=instance&instance=solar:gone')

    expect(screen.getByRole('heading', { name: 'Devices' })).toBeInTheDocument()
  })

  it('opens from the Solar list and steps back to it', async () => {
    const { user } = open('/?page=settings&view=solar')

    await user.click(screen.getByRole('button', { name: /^Venus · 291/ }))
    expect(screen.getByRole('heading', { name: 'Venus · 291' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Solar/ }))
    expect(screen.getByRole('heading', { name: 'Solar' })).toBeInTheDocument()
  })
})
