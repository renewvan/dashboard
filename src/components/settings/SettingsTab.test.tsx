import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { NodeSummary } from '@/lib/nodes'
import { renderSettings } from '@/test/renderSettings'

const tanks: NodeSummary = { domain: 'tanks', label: 'Tanks', count: 1 }
const batteries: NodeSummary = { domain: 'batteries', label: 'Batteries', count: 3 }
const temperature: NodeSummary = { domain: 'temperatures', label: 'Temperature', count: 2 }

function rowNames() {
  const pane = screen.getByTestId('pane-settings')
  return within(pane)
    .getAllByRole('button')
    .map((row) => row.textContent)
}

describe('SettingsTab top list', () => {
  it('lists exactly Nodes, General and Connectivity, in that order, with live descriptions', () => {
    renderSettings({ nodes: [tanks, batteries] })

    expect(rowNames()).toEqual([
      'Nodes2 nodes',
      'GeneralNothing to configure yet',
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

describe('SettingsTab drill-down', () => {
  it.each(['General', 'Connectivity', 'Nodes'])(
    'opens %s under a Settings breadcrumb',
    async (label) => {
      const { user } = renderSettings({ nodes: [tanks] })

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
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('SettingsTab breadcrumb', () => {
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

describe('SettingsTab Nodes', () => {
  it('lists published nodes with their entity counts', async () => {
    const { user } = renderSettings({ nodes: [tanks, batteries, temperature] })

    await user.click(screen.getByRole('button', { name: /^Nodes/ }))

    const list = screen.getByRole('list', { name: 'Published nodes' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['Tanks1 entity', 'Batteries3 entities', 'Temperature2 entities'])
  })

  it('says so when no node has reported yet', async () => {
    const { user } = renderSettings({ nodes: [] })

    await user.click(screen.getByRole('button', { name: /^Nodes/ }))

    expect(screen.getByText(/No nodes connected/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Published nodes' })).not.toBeInTheDocument()
  })
})
