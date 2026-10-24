import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { version } from '../../../package.json'
import type { UserEvent } from '@testing-library/user-event'
import { renderSettings, settingsRows, type RenderSettingsOptions } from '@/test/renderSettings'
import type { SettingsContextValue } from './SettingsContext'
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
  it('lists exactly Devices, General, Connectivity and Van, in that order, with live descriptions', () => {
    renderSettings({}, { bus: { tanks: { fresh: completeTank }, batteries: { '1': {} as never } } })

    expect(rowNames()).toEqual([
      'Devices2 drivers',
      'GeneralFirmware, display, alerts',
      'ConnectivityRouter, Hub, Tailscale',
      'VanVehicle information',
    ])
  })

  it('describes Devices as empty before any driver has published', () => {
    renderSettings({ drivers: [] })

    expect(screen.getByRole('button', { name: /^Devices/ })).toHaveTextContent(
      'No drivers connected',
    )
  })

  it('opens on the top list, titled Settings, with no back button', () => {
    renderSettings()

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(rowNames()).toHaveLength(4)
  })

  it('keeps General and Connectivity under Hub and puts Van under Advanced, after them', () => {
    renderSettings()

    const rowsIn = (group: string) =>
      within(screen.getByRole('region', { name: group }))
        .getAllByRole('button')
        .map((row) => row.textContent)
    expect(rowsIn('Hub')).toEqual([
      'GeneralFirmware, display, alerts',
      expect.stringMatching(/^Connectivity/),
    ])
    expect(rowsIn('Advanced')).toEqual(['VanVehicle information'])
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Hub', 'Advanced'])
  })
})

describe('SettingsPage Van', () => {
  const field = (name: string) => screen.getByRole('textbox', { name })

  async function openVan(overrides: Partial<SettingsContextValue> = {}) {
    const rendered = renderSettings(overrides)
    await rendered.user.click(screen.getByRole('button', { name: /^Van/ }))
    return rendered
  }

  it('opens with Name, Brand, Model, Kms and Plate, in that order, under a Back button to Settings', async () => {
    await openVan()

    expect(screen.getByRole('heading', { name: 'Van' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    const labels = ['Name', 'Brand', 'Model', 'Kms', 'Plate']
    const boxes = screen.getAllByRole('textbox')
    expect(boxes).toHaveLength(labels.length)
    expect(boxes).toEqual(labels.map(field))
  })

  it('shows the stored details', async () => {
    await openVan({
      van: { name: 'Bluey', brand: 'Fiat', model: 'Ducato', kms: '120000', plate: '1234 ABC' },
    })

    expect(field('Name')).toHaveValue('Bluey')
    expect(field('Plate')).toHaveValue('1234 ABC')
  })

  it('saves a field once, on Enter, not on every keystroke', async () => {
    const setVanField = vi.fn()
    const { user } = await openVan({ setVanField })

    await user.type(field('Model'), 'Ducato')
    expect(setVanField).not.toHaveBeenCalled()

    await user.keyboard('{Enter}')
    expect(setVanField).toHaveBeenCalledExactlyOnceWith('model', 'Ducato')
  })

  it('saves on leaving the field, trimmed', async () => {
    const setVanField = vi.fn()
    const { user } = await openVan({ setVanField })

    await user.type(field('Brand'), '  Fiat ')
    await user.tab()

    expect(setVanField).toHaveBeenCalledExactlyOnceWith('brand', 'Fiat')
  })

  it('drops the edit on Escape', async () => {
    const setVanField = vi.fn()
    const { user } = await openVan({ setVanField })

    await user.type(field('Name'), 'Oops')
    await user.keyboard('{Escape}')

    expect(setVanField).not.toHaveBeenCalled()
  })

  it('does not save a field that was not changed', async () => {
    const setVanField = vi.fn()
    const { user } = await openVan({
      setVanField,
      van: { name: 'Bluey', brand: '', model: '', kms: '', plate: '' },
    })

    await user.click(field('Name'))
    await user.tab()

    expect(setVanField).not.toHaveBeenCalled()
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
      'FirmwareHub and dashboard versions',
      'AboutCredits and licences',
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

    expect(rowNames()).toHaveLength(4)
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
    driver: 'tank',
    product: 'Tank driver',
    source: 'ADS1115 (I2C)',
    publishes: ['tank'],
    version: 'v0.8.0',
  }

  async function openFirmware(
    options: RenderSettingsOptions = {},
    overrides: Partial<SettingsContextValue> = {},
  ) {
    const rendered = renderSettings(overrides, options)
    await rendered.user.click(screen.getByRole('button', { name: /^General/ }))
    await rendered.user.click(screen.getByRole('button', { name: /^Firmware/ }))
    return rendered
  }

  const rows = () =>
    within(screen.getByLabelText('Firmware'))
      .getAllByRole('term')
      .map((term) => [term.textContent, term.nextElementSibling?.textContent])

  it('lists the hub first, then the dashboard, then one row per Driver', async () => {
    await openFirmware(
      {
        bus: {
          drivers: {
            tank: { info: tankInfo, health: 'online' },
            temperature: {
              info: {
                ...tankInfo,
                driver: 'temperature',
                product: 'Temperature driver',
                version: 'dev',
              },
              health: 'online',
            },
            router: {
              info: { ...tankInfo, driver: 'router', product: 'Router bridge', version: 'v0.1.0' },
              health: 'offline',
            },
            gps: { health: 'online' },
          },
        },
      },
      {
        hubStatus: { ip: '192.168.1.10', hostname: 'renewvan', version: 'v0.4.0-3-g6a77a25-dirty' },
      },
    )

    expect(rows()).toEqual([
      ['Hub', 'v0.4.0-3-g6a77a25-dirty'],
      ['Dashboard', version],
      ['GPS', 'Unknown'],
      ['Router', 'offline, last seen v0.1.0'],
      ['Tank', 'v0.8.0'],
      ['Temperature', 'dev'],
    ])
  })

  it.each([
    ['the hub has not published yet', null],
    ['the hub plugin predates the version field', { ip: '192.168.1.10', hostname: 'renewvan' }],
  ])('reads the hub as Unknown while %s', async (_, hubStatus) => {
    await openFirmware({}, { hubStatus })

    expect(rows()).toEqual([
      ['Hub', 'Unknown'],
      ['Dashboard', version],
    ])
  })

  it('has no drill-in: it is read-only', async () => {
    await openFirmware({ bus: { drivers: { tank: { info: tankInfo, health: 'online' } } } })

    expect(within(screen.getByLabelText('Firmware')).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('SettingsPage General groups', () => {
  async function openGeneral() {
    const rendered = renderSettings()
    await rendered.user.click(screen.getByRole('button', { name: /^General/ }))
    return rendered
  }

  it('puts Firmware then About under System, and Display & Appearance then Alerts under Preferences', async () => {
    await openGeneral()

    const rowsIn = (name: string) =>
      within(screen.getByRole('region', { name }))
        .getAllByRole('button')
        .map((row) => row.textContent)
    expect(rowsIn('System')).toEqual([
      'FirmwareHub and dashboard versions',
      'AboutCredits and licences',
    ])
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

describe('SettingsPage About', () => {
  async function openAbout(options: RenderSettingsOptions = {}) {
    const rendered = renderSettings({}, options)
    await rendered.user.click(screen.getByRole('button', { name: /^General/ }))
    await rendered.user.click(screen.getByRole('button', { name: /^About/ }))
    return rendered
  }

  /**
   * The loaded software licences: one list item per distinct licence text. They come from a lazy
   * chunk, so under a loaded test run the default 1s wait is not enough.
   */
  const softwareList = () =>
    screen.findByRole('list', { name: 'Software licences' }, { timeout: 4000 })

  it('sits in System between Firmware and the Demo mode switch', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))

    const system = screen.getByRole('region', { name: 'System' })
    expect(system).toHaveTextContent(/Firmware.*About.*Demo mode/)
    expect(within(system).getByRole('switch', { name: /Demo mode/ })).toBeInTheDocument()
  })

  it('opens under General as a read-only page with no drill-in', async () => {
    await openAbout()

    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    await softwareList()
    expect(settingsRows()).toEqual([])
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('has the three blocks: data credits, software and assets', async () => {
    await openAbout()
    await softwareList()

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Data credits', 'Software', 'Assets'])
  })

  it('credits the map data, linking to the OpenStreetMap copyright page', async () => {
    await openAbout()

    expect(screen.getByText('© OpenStreetMap contributors')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /openstreetmap\.org\/copyright/ })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    )
    expect(screen.getByText('Protomaps')).toBeInTheDocument()
    expect(screen.getByText('Natural Earth')).toBeInTheDocument()
    expect(screen.getByText('ESA WorldCover')).toBeInTheDocument()
    // A source of the map file, not a layer the dashboard claims to draw.
    expect(screen.getByText(/a data source of the map file/)).toBeInTheDocument()
  })

  it('shows each distinct licence text once, with the packages that use it', async () => {
    await openAbout()
    const { notices } = await import('@/data/notices.generated')

    const items = within(await softwareList()).getAllByRole('listitem')
    expect(items).toHaveLength(notices.groups.length)
    notices.groups.forEach((group, index) => {
      const item = items[index]
      expect(within(item).getByRole('heading', { name: group.licence })).toBeInTheDocument()
      for (const pkg of group.packages) expect(item).toHaveTextContent(pkg.name)
      // The full text, copyright line included, is in the DOM (the disclosure only folds it).
      const texts = Array.from(item.querySelectorAll('pre'))
      expect(texts.map((pre) => pre.textContent?.trim())).toEqual([group.text.trim()])
    })
    // The stylesheet packages ship in the built CSS, so they are credited too.
    const list = await softwareList()
    expect(list).toHaveTextContent('tailwindcss')
    expect(list).toHaveTextContent('tw-animate-css')
  })

  it('folds each long text behind a disclosure', async () => {
    const { user } = await openAbout()
    const first = within(await softwareList()).getAllByRole('listitem')[0]
    const summary = first.querySelector('summary')!
    const details = first.querySelector('details')!

    expect(details).not.toHaveAttribute('open')
    await user.click(summary)
    expect(details).toHaveAttribute('open')
  })

  it('credits Noto Sans with its copyright line and licence text, and the map sprites', async () => {
    await openAbout()
    await softwareList()

    expect(screen.getByText('Noto Sans')).toBeInTheDocument()
    expect(screen.getByText('Noto Sans').parentElement).toHaveTextContent(
      'Copyright 2022 The Noto Project Authors (https://github.com/notofonts)',
    )
    const texts = screen.getAllByText((_, element) => element?.tagName === 'PRE')
    expect(
      texts.some((pre) => /SIL OPEN FONT LICENSE Version 1\.1/.test(pre.textContent ?? '')),
    ).toBe(true)
    expect(screen.getByText('Map sprites')).toBeInTheDocument()
    expect(screen.getByText(/protomaps\/basemaps-assets/)).toBeInTheDocument()
  })

  it('carries no version rows: versions stay under Firmware', async () => {
    await openAbout()
    const { notices } = await import('@/data/notices.generated')
    const list = await softwareList()

    expect(screen.queryByRole('term')).not.toBeInTheDocument()
    expect(screen.queryByText(version)).not.toBeInTheDocument()
    expect(screen.queryByText('Hub')).not.toBeInTheDocument()
    // Package names are listed bare: no `name@version` or `name version` beside them.
    const [pkg] = notices.groups[0].packages
    expect(list).not.toHaveTextContent(`${pkg.name}@${pkg.version}`)
    expect(list).not.toHaveTextContent(`${pkg.name} ${pkg.version}`)
  })

  it('leaves Firmware as it was, with the hub and dashboard versions', async () => {
    const { user } = await openAbout()
    await softwareList()

    await user.click(screen.getByRole('button', { name: 'General' }))
    await user.click(screen.getByRole('button', { name: /^Firmware/ }))

    expect(
      within(screen.getByLabelText('Firmware'))
        .getAllByRole('term')
        .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
    ).toEqual([
      ['Hub', 'v0.4.0'],
      ['Dashboard', version],
    ])
  })

  it('opens from a ?view=about link, with Back to General', async () => {
    renderSettings({}, { url: '/?page=settings&view=about' })

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    await softwareList()
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument()
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
