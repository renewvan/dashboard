import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vite-plus/test'
import type { AlertHistoryEntry } from '@/lib/alertHistory'
import { AlertsPage } from './AlertsPage'

const open: AlertHistoryEntry = {
  id: 'a1',
  key: 'tank:fresh',
  type: 'error',
  title: 'Fresh water tank alarm',
  description: 'Level requires attention.',
  createdAt: new Date(2024, 0, 5, 9, 5).getTime(),
}

const entry = (overrides: Partial<AlertHistoryEntry>): AlertHistoryEntry => ({
  ...open,
  ...overrides,
})

const rows = () =>
  within(screen.getByRole('list', { name: 'Alert history' })).getAllByRole('listitem')

describe('AlertsPage', () => {
  it('says so when there is nothing in the log, with no list', () => {
    render(<AlertsPage entries={[]} onRemove={vi.fn()} onRemoveMany={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: 'Well done, no active alerts!' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Alert history' })).not.toBeInTheDocument()
  })

  it('lists every entry in the order given, with its title, description and time', () => {
    render(
      <AlertsPage
        entries={[open, entry({ id: 'a2', title: 'Hub connection lost', type: 'warning' })]}
        onRemove={vi.fn()}
        onRemoveMany={vi.fn()}
      />,
    )

    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Fresh water tank alarmLevel requires attention\.Jan 5, 09:05/),
      expect.stringMatching(/^Hub connection lostLevel requires attention\./),
    ])
  })

  it('zero-pads the time in 24-hour form', () => {
    render(
      <AlertsPage
        entries={[entry({ createdAt: new Date(2024, 0, 5, 0, 7).getTime() })]}
        onRemove={vi.fn()}
        onRemoveMany={vi.fn()}
      />,
    )

    expect(screen.getByText(/00:07$/)).toBeInTheDocument()
  })

  it('shows no status for an alert that is still open and unacknowledged', () => {
    render(<AlertsPage entries={[open]} onRemove={vi.fn()} onRemoveMany={vi.fn()} />)

    expect(screen.queryByText('Resolved')).not.toBeInTheDocument()
    expect(screen.queryByText('Acknowledged')).not.toBeInTheDocument()
  })

  it('marks an alert dismissed at its toast as Acknowledged', () => {
    render(
      <AlertsPage
        entries={[entry({ acknowledgedAt: 2 })]}
        onRemove={vi.fn()}
        onRemoveMany={vi.fn()}
      />,
    )

    expect(screen.getByText('Acknowledged')).toBeInTheDocument()
    expect(screen.queryByText('Resolved')).not.toBeInTheDocument()
  })

  it('marks a cleared alert as Resolved', () => {
    render(
      <AlertsPage entries={[entry({ resolvedAt: 2 })]} onRemove={vi.fn()} onRemoveMany={vi.fn()} />,
    )

    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })

  it('shows Resolved alone when an alert was both acknowledged and resolved', () => {
    render(
      <AlertsPage
        entries={[entry({ acknowledgedAt: 2, resolvedAt: 3 })]}
        onRemove={vi.fn()}
        onRemoveMany={vi.fn()}
      />,
    )

    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.queryByText('Acknowledged')).not.toBeInTheDocument()
  })

  it('removes exactly the tapped entry', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(
      <AlertsPage
        entries={[open, entry({ id: 'a2', title: 'Hub connection lost' })]}
        onRemoveMany={vi.fn()}
        onRemove={onRemove}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove alert: Hub connection lost' }))

    expect(onRemove).toHaveBeenCalledExactlyOnceWith('a2')
  })
})

describe('AlertsPage select mode', () => {
  const three = [
    entry({ id: 'a1', title: 'One' }),
    entry({ id: 'a2', title: 'Two' }),
    entry({ id: 'a3', title: 'Three' }),
  ]
  const setup = (entries = three) => {
    const onRemoveMany = vi.fn()
    render(<AlertsPage entries={entries} onRemove={vi.fn()} onRemoveMany={onRemoveMany} />)
    return { onRemoveMany, user: userEvent.setup() }
  }
  const pick = (title: string) => screen.getByRole('checkbox', { name: `Select alert: ${title}` })

  it('offers Select only while there are alerts, and shows no checkboxes until it is pressed', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('has no Select button on an empty log', () => {
    setup([])

    expect(screen.queryByRole('button', { name: 'Select' })).not.toBeInTheDocument()
  })

  it('puts a checkbox on every row and swaps the per-row remove buttons for them', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Select' }))

    expect(screen.getAllByRole('checkbox', { name: /^Select alert:/ })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /^Remove alert:/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Delete/ })).toBeDisabled()
  })

  it('selects all, shows the count, and deletes exactly the selection in list order', async () => {
    const { user, onRemoveMany } = setup()
    await user.click(screen.getByRole('button', { name: 'Select' }))

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))

    expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeChecked()
    expect(screen.getByText('3 selected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete (3)' }))
    expect(onRemoveMany).toHaveBeenCalledExactlyOnceWith(['a1', 'a2', 'a3'])
  })

  it('deletes only the rows picked one by one', async () => {
    const { user, onRemoveMany } = setup()
    await user.click(screen.getByRole('button', { name: 'Select' }))

    await user.click(pick('Three'))
    await user.click(pick('One'))

    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select all' })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Delete (2)' }))
    expect(onRemoveMany).toHaveBeenCalledExactlyOnceWith(['a1', 'a3'])
  })

  it('clears the selection when Select all is pressed again', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Select' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))

    expect(screen.queryByRole('checkbox', { name: /^Select alert:.*/, checked: true })).toBeNull()
    expect(screen.getByRole('button', { name: /^Delete/ })).toBeDisabled()
  })

  it('leaves select mode on Done, dropping the selection', async () => {
    const { user, onRemoveMany } = setup()
    await user.click(screen.getByRole('button', { name: 'Select' }))
    await user.click(pick('Two'))

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove alert: Two' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Select' }))
    expect(pick('Two')).not.toBeChecked()
    expect(onRemoveMany).not.toHaveBeenCalled()
  })

  it('leaves select mode after a delete', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Select' }))
    await user.click(pick('One'))

    await user.click(screen.getByRole('button', { name: 'Delete (1)' }))

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('forgets a selected alert that has left the log', async () => {
    const onRemoveMany = vi.fn()
    const view = render(
      <AlertsPage entries={three} onRemove={vi.fn()} onRemoveMany={onRemoveMany} />,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Select' }))
    await user.click(pick('One'))
    await user.click(pick('Two'))

    view.rerender(
      <AlertsPage entries={three.slice(1)} onRemove={vi.fn()} onRemoveMany={onRemoveMany} />,
    )

    expect(screen.getByText('1 selected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete (1)' }))
    expect(onRemoveMany).toHaveBeenCalledExactlyOnceWith(['a2'])
  })

  it('still removes a single alert with its own button outside select mode', async () => {
    const onRemove = vi.fn()
    render(<AlertsPage entries={three} onRemove={onRemove} onRemoveMany={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Remove alert: Two' }))

    expect(onRemove).toHaveBeenCalledExactlyOnceWith('a2')
  })
})
