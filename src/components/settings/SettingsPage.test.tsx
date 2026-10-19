import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { version } from '../../../package.json'
import type { UserEvent } from '@testing-library/user-event'
import { renderSettings, type RenderSettingsOptions } from '@/test/renderSettings'
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
  const pane = screen.getByTestId('pane-settings')
  return within(pane)
    .getAllByRole('button')
    .map((row) => row.textContent)
}

describe('SettingsPage top list', () => {
  it('lists exactly Nodes, General and Connectivity, in that order, with live descriptions', () => {
    renderSettings({}, { bus: { tanks: { fresh: completeTank }, batteries: { '1': {} as never } } })

    expect(rowNames()).toEqual([
      'Nodes2 nodes',
      'GeneralFirmware, display, alerts',
      'ConnectivityCellular, Hub, Tailscale',
    ])
  })

  it('describes Nodes as empty before any node has published', () => {
    renderSettings({ nodes: [] })

    expect(screen.getByRole('button', { name: /^Nodes/ })).toHaveTextContent('No nodes connected')
  })

  it('opens on the top list, with no breadcrumb', () => {
    renderSettings()

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('SettingsPage drill-down', () => {
  it.each(['General', 'Connectivity', 'Nodes'])(
    'opens %s under a Settings breadcrumb',
    async (label) => {
      const { user } = renderSettings({}, { bus: { tanks: { fresh: completeTank } } })

      await user.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }))

      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: label, current: 'page' })).toBeInTheDocument()
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

    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: /^Connectivity/ }))
    expect(screen.queryByText(/not available/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/nothing to configure/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('button').map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Cellular/),
      expect.stringMatching(/^Hub/),
      expect.stringMatching(/^Tailscale/),
    ])
  })
})

describe('SettingsPage breadcrumb', () => {
  it('walks back to the top list from the Settings crumb', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))

    await user.click(screen.getByRole('link', { name: 'Settings' }))

    expect(rowNames()).toHaveLength(3)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('does not act on the current page, and a keyboard Enter on an ancestor walks up', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^Connectivity/ }))

    const current = screen.getByRole('link', { name: 'Connectivity', current: 'page' })
    await user.click(current)
    expect(screen.getByRole('link', { name: 'Connectivity', current: 'page' })).toBeInTheDocument()

    screen.getByRole('link', { name: 'Settings' }).focus()
    await user.keyboard('{Enter}')
    expect(rowNames()).toHaveLength(3)
  })
})

describe('SettingsPage Firmware', () => {
  const tankInfo = {
    node: 'tank',
    product: 'Tank node',
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

  it('lists the dashboard first, then one row per Node, worded as on the Nodes page', async () => {
    await openFirmware({
      bus: {
        nodes: {
          tank: { info: tankInfo, health: 'online' },
          temperature: {
            info: { ...tankInfo, node: 'temperature', product: 'Temperature node', version: 'dev' },
            health: 'online',
          },
          router: {
            info: { ...tankInfo, node: 'router', product: 'Router bridge', version: 'v0.1.0' },
            health: 'offline',
          },
          gps: { health: 'online' },
        },
      },
    })

    expect(rows()).toEqual([
      ['Dashboard', version],
      ['gps', 'Unknown'],
      ['Router bridge', 'offline, last seen v0.1.0'],
      ['Tank node', 'v0.8.0'],
      ['Temperature node', 'dev'],
    ])
  })

  it('lists only the dashboard while no Node has reported', async () => {
    await openFirmware()

    expect(rows()).toEqual([['Dashboard', version]])
  })

  it('has no drill-in: it is read-only', async () => {
    await openFirmware({ bus: { nodes: { tank: { info: tankInfo, health: 'online' } } } })

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

    expect(screen.getByRole('link', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Firmware', current: 'page' })).toBeInTheDocument()
    expect(within(screen.getByLabelText('Firmware')).getByText(version)).toBeVisible()
  })
})

describe('SettingsPage Alerts', () => {
  async function openAlerts(user: UserEvent) {
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(screen.getByRole('button', { name: /^Alerts/ }))
  }

  it.each([
    [true, 'Notifications on'],
    [false, 'Notifications off'],
  ])('describes the Alerts row from the preference (%s)', async (alertsEnabled, text) => {
    const { user } = renderSettings({ alertsEnabled })

    await user.click(screen.getByRole('button', { name: /^General/ }))

    expect(screen.getByRole('button', { name: /^Alerts/ })).toHaveTextContent(text)
  })

  it('shows a labelled switch that reflects the preference', async () => {
    const { user } = renderSettings({ alertsEnabled: true })

    await openAlerts(user)

    expect(screen.getByRole('link', { name: 'Alerts', current: 'page' })).toBeInTheDocument()
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
