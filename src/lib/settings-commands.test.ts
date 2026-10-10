import { describe, expect, it, vi } from 'vitest'
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
})
