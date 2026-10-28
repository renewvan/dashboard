import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'
import type { Battery, DriverInfo, RenewvanBusState } from '@/types'

const venusInfo: DriverInfo = {
  driver: 'venus',
  product: 'Venus OS bridge',
  source: 'Venus OS MQTT',
  publishes: ['battery', 'solar', 'charger'],
  version: 'v0.5.0',
}

const wattcycleInfo: DriverInfo = {
  driver: 'wattcycle',
  product: 'WattCycle BMS',
  source: 'Bluetooth LE',
  publishes: ['battery'],
  version: 'v0.2.0',
}

const house: Battery = {
  driver: 'venus',
  soc_pct: 83.4,
  voltage_v: 13.27,
  current_a: -2.64,
  power_w: -35.2,
  temperature_c: 21.5,
  time_to_go_s: 5 * 3_600 + 12 * 60,
}
const bank: Battery = {
  driver: 'wattcycle',
  name: 'Bank',
  soc_pct: 61,
  voltage_v: 13.1,
  current_a: 1,
  power_w: 13,
}

const drivers: RenewvanBusState['drivers'] = {
  venus: { info: venusInfo, health: 'online' },
  wattcycle: { info: wattcycleInfo, health: 'online' },
}

beforeEach(() => {
  window.localStorage.clear()
})

/** Settings › Devices › Batteries, deep-linked. */
function openBatteries(
  bus: Partial<RenewvanBusState>,
  overrides: Parameters<typeof renderSettings>[0] = {},
) {
  return renderSettings(overrides, {
    url: '/?page=settings&view=batteries',
    bus: { drivers, ...bus },
  })
}

/** A device's row: its title on the left, its short summary on the right. */
const row = (name: string | RegExp) => screen.getByRole('button', { name })

describe('Settings Batteries view', () => {
  it('lists every battery as a row: its label, owning Driver and a short summary', () => {
    openBatteries({ batteries: { '512': house, wattcycle: bank } })

    expect(screen.getByRole('heading', { name: 'Batteries' })).toBeInTheDocument()
    expect(row(/^Venus · 512/)).toHaveTextContent('Venus · 512Driver: Venus83%13.27V-2.6A')
    // A name wins over the Driver and id.
    expect(row(/^Bank/)).toHaveTextContent('BankDriver: Wattcycle61%13.10V1.0A')
  })

  it('leaves out a figure it does not have, for a battery still missing measurements', () => {
    openBatteries({ batteries: { '512': { soc_pct: 70 } as Battery } })

    expect(row(/^512/)).toHaveTextContent('512Driver: —70%')
    expect(row(/^512/)).not.toHaveTextContent('V')
  })

  it('names a legacy instance that names no Driver by its id, with an unknown owner', () => {
    openBatteries({ batteries: { '512': { ...house, driver: undefined } } })

    expect(row(/^512/)).toHaveTextContent('Driver: —')
  })

  it('says so while no battery has published', () => {
    openBatteries({})

    expect(screen.getByText(/No batteries found/)).toBeInTheDocument()
  })

  it('hides the Primary battery selector with one battery', () => {
    openBatteries({ batteries: { '512': house } })

    expect(screen.queryByRole('radiogroup', { name: 'Primary battery' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Reading from/)).not.toBeInTheDocument()
  })

  describe('Primary battery selector', () => {
    const batteries = { '512': house, wattcycle: bank }
    const selector = () => screen.getByRole('radiogroup', { name: 'Primary battery' })

    it('offers Auto and one entry per battery, labelled like its card, with the selection marked', () => {
      openBatteries({ batteries }, { primaryBatterySelection: 'wattcycle' })

      const buttons = within(selector()).getAllByRole('radio')
      expect(buttons.map((b) => b.textContent)).toEqual(['Auto', 'Venus · 512', 'Bank'])
      expect(buttons[0]).not.toBeChecked()
      expect(buttons[1]).not.toBeChecked()
      expect(buttons[2]).toBeChecked()
    })

    it('marks Auto and says what it reads: the first battery by id', () => {
      openBatteries({ batteries })

      expect(within(selector()).getByRole('radio', { name: 'Auto' })).toBeChecked()
      expect(screen.getByText('Reading from Venus · 512')).toBeInTheDocument()
    })

    it('publishes the exact choice through setPrimaryBattery', async () => {
      const setPrimaryBattery = vi.fn()
      const { user } = openBatteries({ batteries }, { setPrimaryBattery })

      await user.click(within(selector()).getByRole('radio', { name: 'Bank' }))

      expect(setPrimaryBattery).toHaveBeenCalledExactlyOnceWith('wattcycle')
    })

    it('publishes auto when Auto is picked again after a selection', async () => {
      const setPrimaryBattery = vi.fn()
      const { user } = openBatteries(
        { batteries },
        { setPrimaryBattery, primaryBatterySelection: 'wattcycle' },
      )

      await user.click(within(selector()).getByRole('radio', { name: 'Auto' }))

      expect(setPrimaryBattery).toHaveBeenCalledExactlyOnceWith('auto')
    })

    it('does not publish again for the choice that is already selected', async () => {
      const setPrimaryBattery = vi.fn()
      const { user } = openBatteries({ batteries }, { setPrimaryBattery })

      await user.click(within(selector()).getByRole('radio', { name: 'Auto' }))

      expect(setPrimaryBattery).not.toHaveBeenCalled()
    })

    it('says which battery is read while the selection follows it', () => {
      openBatteries({ batteries }, { primaryBatterySelection: 'wattcycle' })

      expect(screen.getByText('Reading from Bank')).toBeInTheDocument()
    })

    it.each([
      ['absent', {}],
      ['not fully arrived', { gone: { soc_pct: 50 } as Battery }],
    ])('notes the fallback when the selected battery is %s', (_, extra) => {
      openBatteries({ batteries: { ...batteries, ...extra } }, { primaryBatterySelection: 'gone' })

      expect(screen.getByText('gone is not available, using Venus · 512')).toBeInTheDocument()
    })
  })
})

describe('Settings Solar and Chargers views', () => {
  async function open(view: 'solar' | 'chargers', bus: Partial<RenewvanBusState>) {
    return renderSettings({}, { url: `/?page=settings&view=${view}`, bus: { drivers, ...bus } })
  }

  it('lists a solar controller with its power and yield today', async () => {
    await open('solar', {
      solar: {
        '291': { driver: 'venus', power_w: 412.4, battery_voltage_v: 13.4, yield_today_wh: 1840 },
      },
    })

    expect(screen.getByRole('heading', { name: 'Solar' })).toBeInTheDocument()
    expect(row(/^Venus · 291/)).toHaveTextContent('Venus · 291Driver: Venus412W')
  })

  it('shows only the power of a controller that reports nothing more', async () => {
    await open('solar', { solar: { '291': { power_w: 10, battery_voltage_v: 13.4 } } })

    expect(row(/^291/)).toHaveTextContent('291Driver: —10W')
  })

  it('lists a charger with its voltage, current and power, leaving out what it lacks', async () => {
    await open('chargers', {
      chargers: {
        '1': { driver: 'venus', voltage_v: 13.4 },
        '2': { voltage_v: 12.9, current_a: 8 },
      },
    })

    expect(screen.getByRole('heading', { name: 'Chargers' })).toBeInTheDocument()
    expect(row(/^Venus · 1/)).toHaveTextContent('Venus · 1Driver: Venus13.40V')
    expect(row(/^2/)).toHaveTextContent('2Driver: —12.90V8.0A103W')
  })

  it('never shows the Primary battery selector', async () => {
    await open('solar', {
      solar: {
        a: { power_w: 1, battery_voltage_v: 13 },
        b: { power_w: 2, battery_voltage_v: 13 },
      },
    })

    expect(screen.queryByRole('radiogroup', { name: 'Primary battery' })).not.toBeInTheDocument()
  })
})

describe('Settings Driver page: instances rows', () => {
  async function openVenus(user: UserEvent) {
    await user.click(screen.getByRole('button', { name: /^Devices/ }))
    await user.click(screen.getByRole('button', { name: /^Venus/ }))
  }

  it('opens the instances view from the Batteries row, counting that Drivers own instances', async () => {
    const { user } = renderSettings(
      {},
      { bus: { drivers, batteries: { '512': house, wattcycle: bank } } },
    )
    await openVenus(user)

    // The two sources publish the one bank; the Venus page counts only Venus' own.
    expect(screen.getByRole('button', { name: /^Batteries.*1 battery$/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Batteries/ }))

    expect(screen.getByRole('heading', { name: 'Batteries' })).toBeInTheDocument()
    // The view lists ALL instances, side by side.
    expect(screen.getByRole('list', { name: 'Batteries' }).children).toHaveLength(2)
  })

  it('opens the Solar and Chargers views from their rows', async () => {
    const { user } = renderSettings(
      {},
      {
        bus: {
          drivers,
          solar: { '291': { driver: 'venus', power_w: 1, battery_voltage_v: 13 } },
          chargers: { '1': { driver: 'venus', voltage_v: 13 } },
        },
      },
    )
    await openVenus(user)

    await user.click(screen.getByRole('button', { name: /^Solar/ }))
    expect(screen.getByRole('heading', { name: 'Solar' })).toBeInTheDocument()
    // Back goes to the Driver page it was opened from, not to the Devices list.
    await user.click(
      within(screen.getByRole('navigation', { name: 'Settings navigation' })).getAllByRole(
        'button',
      )[0],
    )
    expect(screen.getByRole('heading', { name: 'Venus' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Chargers/ }))
    expect(screen.getByRole('heading', { name: 'Chargers' })).toBeInTheDocument()
  })
})
