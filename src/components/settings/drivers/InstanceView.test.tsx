import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'
import type { Battery, Charger, RenewvanBusState, Solar } from '@/types'

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

// The hub's wattcycle demo scenario: 4 cells, 4 probes, one cell balancing, a brief protection.
const bms: Battery = {
  driver: 'venus',
  name: 'WattCycle 314Ah',
  soc_pct: 94,
  voltage_v: 13.21,
  current_a: -7.6,
  power_w: -100.4,
  cell_voltages_v: [3.303, 3.305, 3.304, 3.302],
  cell_voltage_max_v: 3.305,
  cell_voltage_min_v: 3.302,
  cell_voltage_delta_v: 0.003,
  cell_balancing: [false, true, false, false],
  temperatures_c: [22.5, 22.1, null, 22.9],
  allow_charge: true,
  allow_discharge: false,
  protections: [],
}

const shunt: Battery = {
  driver: 'venus',
  name: 'Shunt',
  soc_pct: 90,
  voltage_v: 13.3,
  current_a: 1,
  power_w: 13,
}

describe('Settings battery device page: BMS data', () => {
  it('shows the cells, probes, permissions and protections of the instance that carries them', () => {
    open('/?page=settings&view=instance&instance=battery:wattcycle', {
      batteries: { wattcycle: bms },
    })

    expect(screen.getByRole('heading', { name: 'WattCycle 314Ah' })).toBeInTheDocument()
    const cells = screen.getByRole('img', { name: /4 cells/i })
    expect(cells).toBeInTheDocument()
    expect(screen.getByText('Balancing')).toBeInTheDocument()
    const probes = screen.getByLabelText('Probes')
    expect(within(probes).getByText('Probe 3').nextElementSibling).toHaveTextContent('—')
    const permissions = screen.getByLabelText('Permissions and limits')
    expect(within(permissions).getByText('Charging allowed').nextElementSibling).toHaveTextContent(
      'Yes',
    )
    expect(
      within(permissions).getByText('Discharging allowed').nextElementSibling,
    ).toHaveTextContent('No')
    expect(
      within(screen.getByLabelText('Protections')).getByText('None active'),
    ).toBeInTheDocument()
  })

  it('names an active protection', () => {
    open('/?page=settings&view=instance&instance=battery:wattcycle', {
      batteries: { wattcycle: { ...bms, protections: ['cell_undervoltage'] } },
    })
    expect(
      within(screen.getByLabelText('Protections')).getByText('Cell undervoltage'),
    ).toBeInTheDocument()
  })

  it('shows no BMS group and no placeholder on a battery that publishes none of it', () => {
    open('/?page=settings&view=instance&instance=battery:shunt', {
      batteries: { shunt, wattcycle: bms },
    })
    expect(screen.queryByRole('img', { name: /cells/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Probes')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Protections')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Permissions and limits')).not.toBeInTheDocument()
  })

  it('reads an unreadable cell as — and never as 0', () => {
    open('/?page=settings&view=instance&instance=battery:wattcycle', {
      batteries: { wattcycle: { ...bms, cell_voltages_v: [3.3, null, 3.31, 3.3] } },
    })
    const cells = screen.getByRole('img', { name: /4 cells/i })
    expect(cells).toHaveAccessibleName(expect.stringContaining('cell 2 —'))
    expect(cells).not.toHaveAccessibleName(expect.stringContaining('0.000'))
  })
})
