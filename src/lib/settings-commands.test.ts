import { describe, expect, it, vi } from 'vite-plus/test'
import { settingsCommands } from './settings-commands'

function setup() {
  const publish = vi.fn()
  return { publish, commands: settingsCommands(publish) }
}

describe('settingsCommands', () => {
  it('publishes brightness as a JSON number on the hyphenated /set topic', () => {
    const { publish, commands } = setup()

    commands.setBrightness(42)

    expect(publish).toHaveBeenCalledExactlyOnceWith('renewvan/kiosk/display/brightness/set', '42')
  })

  it('publishes auto-sleep as a JSON boolean', () => {
    const { publish, commands } = setup()

    commands.setAutoSleepEnabled(true)
    commands.setAutoSleepEnabled(false)

    expect(publish).toHaveBeenNthCalledWith(
      1,
      'renewvan/kiosk/display/auto-sleep-enabled/set',
      'true',
    )
    expect(publish).toHaveBeenNthCalledWith(
      2,
      'renewvan/kiosk/display/auto-sleep-enabled/set',
      'false',
    )
    expect(publish).toHaveBeenCalledTimes(2)
  })

  it('publishes the auto-sleep timeout as a JSON number', () => {
    const { publish, commands } = setup()

    commands.setAutoSleepTimeoutMinutes(15)

    expect(publish).toHaveBeenCalledExactlyOnceWith(
      'renewvan/kiosk/display/auto-sleep-timeout-minutes/set',
      '15',
    )
  })

  it("publishes a sensor name as a quoted JSON string on that sensor's topic", () => {
    const { publish, commands } = setup()

    commands.setTemperatureName('outdoor', 'Galley roof')

    expect(publish).toHaveBeenCalledExactlyOnceWith(
      'renewvan/temperature/outdoor/name/set',
      '"Galley roof"',
    )
  })

  it("publishes a relay's target state as a bare JSON boolean on that relay's set topic", () => {
    const { publish, commands } = setup()

    commands.setRelay('relay_03', true)
    commands.setRelay('relay_03', false)

    expect(publish).toHaveBeenNthCalledWith(1, 'renewvan/relay/relay_03/set', 'true')
    expect(publish).toHaveBeenNthCalledWith(2, 'renewvan/relay/relay_03/set', 'false')
    expect(publish).toHaveBeenCalledTimes(2)
  })

  it("publishes a relay name as a quoted JSON string on that relay's name/set topic", () => {
    const { publish, commands } = setup()

    commands.setRelayName('relay_03', 'Water "pump"')

    expect(publish).toHaveBeenCalledExactlyOnceWith(
      'renewvan/relay/relay_03/name/set',
      '"Water \\"pump\\""',
    )
  })

  it("publishes a sensor unit as a quoted JSON string on that sensor's topic", () => {
    const { publish, commands } = setup()

    commands.setTemperatureUnit('28-000000259026', 'F')

    expect(publish).toHaveBeenCalledExactlyOnceWith(
      'renewvan/temperature/28-000000259026/unit/set',
      '"F"',
    )
  })

  it("publishes a sensor icon as a quoted JSON string on that sensor's topic", () => {
    const { publish, commands } = setup()

    commands.setTemperatureIcon('outdoor', 'Refrigerator')

    expect(publish).toHaveBeenCalledExactlyOnceWith(
      'renewvan/temperature/outdoor/icon/set',
      '"Refrigerator"',
    )
  })

  it('publishes the Primary battery choice as a quoted JSON string on the hub set topic', () => {
    const { publish, commands } = setup()

    commands.setPrimaryBattery('auto')
    commands.setPrimaryBattery('wattcycle')

    expect(publish).toHaveBeenNthCalledWith(1, 'renewvan/hub/primary-battery/set', '"auto"')
    expect(publish).toHaveBeenNthCalledWith(2, 'renewvan/hub/primary-battery/set', '"wattcycle"')
    expect(publish).toHaveBeenCalledTimes(2)
  })
})
