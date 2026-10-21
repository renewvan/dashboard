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
    render(<AlertsPage entries={[]} onRemove={vi.fn()} />)

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
      />,
    )

    expect(screen.getByText(/00:07$/)).toBeInTheDocument()
  })

  it('shows no status for an alert that is still open and unacknowledged', () => {
    render(<AlertsPage entries={[open]} onRemove={vi.fn()} />)

    expect(screen.queryByText('Resolved')).not.toBeInTheDocument()
    expect(screen.queryByText('Acknowledged')).not.toBeInTheDocument()
  })

  it('marks an alert dismissed at its toast as Acknowledged', () => {
    render(<AlertsPage entries={[entry({ acknowledgedAt: 2 })]} onRemove={vi.fn()} />)

    expect(screen.getByText('Acknowledged')).toBeInTheDocument()
    expect(screen.queryByText('Resolved')).not.toBeInTheDocument()
  })

  it('marks a cleared alert as Resolved', () => {
    render(<AlertsPage entries={[entry({ resolvedAt: 2 })]} onRemove={vi.fn()} />)

    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })

  it('shows Resolved alone when an alert was both acknowledged and resolved', () => {
    render(
      <AlertsPage entries={[entry({ acknowledgedAt: 2, resolvedAt: 3 })]} onRemove={vi.fn()} />,
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
        onRemove={onRemove}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove alert: Hub connection lost' }))

    expect(onRemove).toHaveBeenCalledExactlyOnceWith('a2')
  })
})
