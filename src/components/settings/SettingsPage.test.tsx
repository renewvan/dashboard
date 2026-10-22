import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { version } from '../../../package.json'
import type { UserEvent } from '@testing-library/user-event'
import { renderSettings, settingsRows, type RenderSettingsOptions } from '@/test/renderSettings'
import type { Tank } from '@/types'

const completeTank: Tank = {
  fluid_type: 'fresh_water',
  capacity_l: 100,
  level_pct: 62,
  status: 'ok',
  volume_since_full_l: 0,
  volume_since_empty_l: 0,
}

function rowNames() {
  return settingsRows().map((row) => row.textContent)
}

describe('SettingsPage top list', () => {
  it('lists exactly Devices, General and Connectivity, in that order, with live descriptions', () => {
    renderSettings({}, { bus: { tanks: { fresh: completeTank }, batteries: { '1': {} as never } } })

    expect(rowNames()).toEqual([
      'Devices2 devices',
      'GeneralFirmware, display, alerts',
      'ConnectivityRouter, Hub, Tailscale',
    ])
  })

  it('describes Devices as empty before any device has published', () => {
    renderSettings({ devices: [] })

    expect(screen.getByRole('button', { name: /^Devices/ })).toHaveTextContent(
      'No devices connected',
    )
  })

  it('opens on the top list, titled Settings, with no back button', () => {
    renderSettings()

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(rowNames()).toHaveLength(3)
  })
})

describe('SettingsPage drill-down', () => {
  it.each(['General', 'Connectivity', 'Devices'])(
    'opens %s with a Back button named Settings in place of the Settings title',
    async (label) => {
      const { user } = renderSettings({}, { bus: { tanks: { fresh: completeTank } } })

      await user.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }))

      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument()
    },
  )

  it('shows no placeholder or "not available" pages in the groups', async () => {
    const { user } = renderSettings()

    await user.click(screen.getByRole('button', { name: /^General/ }))
    expect(screen.queryByText(/not available/i)).not.toBeInTheDocument()
    expect(rowNames()).toEqual([
      'FirmwareDashboard version',
      'Display & AppearanceTheme, brightness, auto-sleep, layout',
      'AlertsNotifications on',
    ])

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: /^Connectivity/ }))
    expect(screen.queryByText(/not available/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/nothing to configure/i)).not.toBeInTheDocument()
    expect(settingsRows().map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Router/),
      expect.stringMatching(/^Hub/),
      expect.stringMatching(/^Tailscale/),
    ])
  })
})

describe('SettingsPage navigation bar', () => {
  it('walks back to the top list from a depth-1 page', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))

    await user.click(screen.getByRole('button', { name: 'Settings' }))

    expect(rowNames()).toHaveLength(3)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('steps up exactly one level at a time, naming each parent', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(screen.getByRole('button', { name: /^Display/ }))
    await user.click(screen.getByRole('button', { name: /^Power page/ }))
    expect(screen.getByRole('heading', { name: 'Power page' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Display & Appearance' }))
    expect(screen.getByRole('heading', { name: 'Display & Appearance' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'General' }))
    expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('puts the sleep button at the right of a subpage bar, and sleeps the display', async () => {
    const { user, value } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))

    const nav = screen.getByRole('navigation', { name: 'Settings navigation' })
    await user.click(within(nav).getByRole('button', { name: 'Sleep display' }))

    expect(value.sleepDisplay).toHaveBeenCalledOnce()
  })

  it('offers Wake while the display is off, and wakes it', async () => {
    const { user, value } = renderSettings({ displayPower: 'off' })
    await user.click(screen.getByRole('button', { name: /^General/ }))

    const nav = screen.getByRole('navigation', { name: 'Settings navigation' })
    await user.click(within(nav).getByRole('button', { name: 'Wake display' }))

    expect(value.wakeDisplay).toHaveBeenCalledOnce()
  })

  it('puts the alert bell left of the sleep button, with the unseen count, and opens Alerts', async () => {
    const { user, value } = renderSettings({ unseenAlertCount: 3 })
    await user.click(screen.getByRole('button', { name: /^General/ }))

    const nav = within(screen.getByRole('navigation', { name: 'Settings navigation' }))
    const bell = nav.getByRole('button', { name: 'Alerts, 3 active' })
    const sleep = nav.getByRole('button', { name: 'Sleep display' })
    expect(bell.compareDocumentPosition(sleep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await user.click(bell)
    expect(value.openAlerts).toHaveBeenCalledOnce()
  })
})

describe('SettingsPage Firmware', () => {
  const tankInfo = {
    device: 'tank',
    product: 'Tank device',
    source: 'ADS1115 (I2C)',
    publishes: ['tank'],
    version: 'v0.8.0',
  }

  async function openFirmware(options: RenderSettingsOptions = {}) {
    const rendered = renderSettings({}, options)
    await rendered.user.click(screen.getByRole('button', { name: /^General/ }))
    await rendered.user.click(screen.getByRole('button', { name: /^Firmware/ }))
    return rendered
  }

  const rows = () =>
    within(screen.getByLabelText('Firmware'))
      .getAllByRole('term')
      .map((term) => [term.textContent, term.nextElementSibling?.textContent])

  it('lists the dashboard first, then one row per Device, worded as on the Devices page', async () => {
    await openFirmware({
      bus: {
        devices: {
          tank: { info: tankInfo, health: 'online' },
          temperature: {
            info: {
              ...tankInfo,
              device: 'temperature',
              product: 'Temperature device',
              version: 'dev',
            },
            health: 'online',
          },
          router: {
            info: { ...tankInfo, device: 'router', product: 'Router bridge', version: 'v0.1.0' },
            health: 'offline',
          },
          gps: { health: 'online' },
        },
      },
    })

    expect(rows()).toEqual([
      ['Dashboard', version],
      ['GPS', 'Unknown'],
      ['Router', 'offline, last seen v0.1.0'],
      ['Tank', 'v0.8.0'],
      ['Temperature', 'dev'],
    ])
  })

  it('lists only the dashboard while no Device has reported', async () => {
    await openFirmware()

    expect(rows()).toEqual([['Dashboard', version]])
  })

  it('has no drill-in: it is read-only', async () => {
    await openFirmware({ bus: { devices: { tank: { info: tankInfo, health: 'online' } } } })

    expect(within(screen.getByLabelText('Firmware')).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('SettingsPage General groups', () => {
  async function openGeneral() {
    const rendered = renderSettings()
    await rendered.user.click(screen.getByRole('button', { name: /^General/ }))
    return rendered
  }

  it('puts Firmware under System, and Display & Appearance then Alerts under Preferences', async () => {
    await openGeneral()

    const rowsIn = (name: string) =>
      within(screen.getByRole('region', { name }))
        .getAllByRole('button')
        .map((row) => row.textContent)
    expect(rowsIn('System')).toEqual(['FirmwareDashboard version'])
    expect(rowsIn('Preferences')).toEqual([
      'Display & AppearanceTheme, brightness, auto-sleep, layout',
      'AlertsNotifications on',
    ])
    // System comes first.
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['System', 'Preferences'])
  })

  it('opens Firmware under General with the dashboard version', async () => {
    const { user } = await openGeneral()

    await user.click(screen.getByRole('button', { name: /^Firmware/ }))

    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Firmware' })).toBeInTheDocument()
    expect(within(screen.getByLabelText('Firmware')).getByText(version)).toBeVisible()
  })
})

describe('SettingsPage Alerts', () => {
  async function openAlerts(user: UserEvent) {
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(screen.getByRole('button', { name: /^AlertsNotifications/ }))
  }

  it.each([
    [true, 'Notifications on'],
    [false, 'Notifications off'],
  ])('describes the Alerts row from the preference (%s)', async (alertsEnabled, text) => {
    const { user } = renderSettings({ alertsEnabled })

    await user.click(screen.getByRole('button', { name: /^General/ }))

    expect(screen.getByRole('button', { name: /^AlertsNotifications/ })).toHaveTextContent(text)
  })

  it('shows a labelled switch that reflects the preference', async () => {
    const { user } = renderSettings({ alertsEnabled: true })

    await openAlerts(user)

    expect(screen.getByRole('heading', { name: 'Alerts' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Show alert notifications' })).toBeChecked()
  })

  it('shows the switch off when notifications are off', async () => {
    const { user } = renderSettings({ alertsEnabled: false })

    await openAlerts(user)

    expect(screen.getByRole('switch', { name: 'Show alert notifications' })).not.toBeChecked()
  })

  it('reports false when switched off', async () => {
    const setAlertsEnabled = vi.fn()
    const { user } = renderSettings({ alertsEnabled: true, setAlertsEnabled })
    await openAlerts(user)

    await user.click(screen.getByRole('switch', { name: 'Show alert notifications' }))

    expect(setAlertsEnabled).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('reports true when switched on', async () => {
    const setAlertsEnabled = vi.fn()
    const { user } = renderSettings({ alertsEnabled: false, setAlertsEnabled })
    await openAlerts(user)

    await user.click(screen.getByRole('switch', { name: 'Show alert notifications' }))

    expect(setAlertsEnabled).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('toggles when the label text is tapped, not only the control', async () => {
    const setAlertsEnabled = vi.fn()
    const { user } = renderSettings({ alertsEnabled: true, setAlertsEnabled })
    await openAlerts(user)

    await user.click(screen.getByText('Show alert notifications'))

    expect(setAlertsEnabled).toHaveBeenCalledExactlyOnceWith(false)
  })
})

describe('SettingsPage Demo mode', () => {
  it.each([
    [false, true],
    [true, false],
  ])('reports %s -> %s when its whole row is tapped, inline in General', async (demoMode, next) => {
    const setDemoMode = vi.fn()
    const { user } = renderSettings({ demoMode, setDemoMode })
    await user.click(screen.getByRole('button', { name: /^General/ }))

    const row = screen.getByRole('switch', { name: /^Demo mode/ })
    expect(row.matches(':checked')).toBe(demoMode)
    await user.click(screen.getByText('Demo mode'))

    expect(setDemoMode).toHaveBeenCalledExactlyOnceWith(next)
  })
})
