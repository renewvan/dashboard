import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { Droplets } from 'lucide-react'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import type { Relay } from '@/types'
import { RelaysPage, GIVE_UP_MS, type RelaysPageProps } from './RelaysPage'

const KIOSK_WIDTH = 800

let viewport: MatchMediaStub
const onSetRelay = vi.fn()

function setup(props: Partial<RelaysPageProps> & { relays: Record<string, Relay> }) {
  viewport = stubMatchMedia(KIOSK_WIDTH)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const all: RelaysPageProps = {
    nodeOnline: true,
    demo: false,
    onSetRelay,
    ...props,
  }
  const view = render(<RelaysPage {...all} />)
  const rerender = (next: Partial<RelaysPageProps>) =>
    view.rerender(<RelaysPage {...all} {...next} />)
  return { user, rerender }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  onSetRelay.mockClear()
  cleanup()
  viewport.restore()
  vi.useRealTimers()
})

/** A channel's control, found by the label announced for it. */
/** Moves the fake clock inside `act`, so React flushes the timer's state update. */
const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

const control = (name: string) => screen.getByRole('radiogroup', { name })
const segment = (name: string, word: 'Off' | 'On') =>
  within(control(name)).getByRole('radio', { name: word })

/** The glyph beside a channel's label: the one icon inside the channel that owns this control. */
const channelIcon = (name: string) => {
  const icon = control(name).parentElement?.querySelector('svg')
  if (!icon) throw new Error(`no icon beside ${name}`)
  return icon
}

const PUMP: Relay = { name: 'Water pump', state: false }
const LIGHTS: Relay = { name: 'Ceiling lights', state: true }

describe('RelaysPage', () => {
  it('shows each relay by its wire name and its latched state', () => {
    setup({ relays: { relay_01: LIGHTS, relay_03: PUMP } })

    expect(segment('Ceiling lights', 'On')).toBeChecked()
    expect(segment('Ceiling lights', 'Off')).not.toBeChecked()
    expect(segment('Water pump', 'Off')).toBeChecked()
  })

  it('labels an unnamed relay by its id, so a new channel is visible and unconfigured', () => {
    setup({ relays: { relay_04: { state: true } } })

    expect(control('relay_04')).toBeInTheDocument()
  })

  it('shows a configured icon even on an unnamed channel: the config says what the load is', () => {
    setup({ relays: { relay_04: { state: true } }, icons: { relay_04: Droplets } })

    expect(channelIcon('relay_04')).toHaveClass('lucide-droplets')
  })

  it('shows the neutral glyph for a channel with no configured icon', () => {
    setup({ relays: { relay_04: { name: 'Mystery', state: true } }, icons: {} })

    expect(channelIcon('Mystery')).toHaveClass('lucide-power')
  })

  it('puts a channel missing from the group configuration under Unassigned', () => {
    setup({ relays: { relay_99: { name: 'New thing', state: false } } })

    const panel = screen.getByRole('region', { name: 'Unassigned' })
    expect(within(panel).getByRole('radiogroup', { name: 'New thing' })).toBeInTheDocument()
  })

  it('never claims a load is energised', () => {
    setup({ relays: { relay_01: LIGHTS } })

    expect(screen.queryByText(/energi[sz]ed/i)).not.toBeInTheDocument()
  })

  it('switches a non-critical load immediately, sending the target state', async () => {
    const { user } = setup({ relays: { relay_01: { name: 'Ceiling lights', state: false } } })

    await user.click(segment('Ceiling lights', 'On'))

    expect(onSetRelay).toHaveBeenCalledExactlyOnceWith('relay_01', true)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('sends nothing when the already-selected segment is tapped again', async () => {
    const { user } = setup({ relays: { relay_01: LIGHTS } })

    await user.click(segment('Ceiling lights', 'On'))

    expect(onSetRelay).not.toHaveBeenCalled()
  })

  it('shows the tapped target as pending, with the control disabled, until the state arrives', async () => {
    const { user, rerender } = setup({
      relays: { relay_01: { name: 'Ceiling lights', state: false } },
    })

    await user.click(segment('Ceiling lights', 'On'))

    expect(segment('Ceiling lights', 'On')).toBeChecked()
    expect(segment('Ceiling lights', 'On')).toBeDisabled()
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()

    rerender({ relays: { relay_01: { name: 'Ceiling lights', state: true } } })

    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
    expect(segment('Ceiling lights', 'On')).toBeEnabled()
    expect(screen.queryByText("Didn't switch")).not.toBeInTheDocument()
  })

  it('does not report a failure when the state arrives just inside the give-up window', async () => {
    const { user, rerender } = setup({
      relays: { relay_01: { name: 'Ceiling lights', state: false } },
    })
    await user.click(segment('Ceiling lights', 'On'))

    advance(GIVE_UP_MS - 1)
    rerender({ relays: { relay_01: { name: 'Ceiling lights', state: true } } })
    advance(GIVE_UP_MS)

    expect(screen.queryByText("Didn't switch")).not.toBeInTheDocument()
  })

  it('reports "Didn\'t switch" after 4 seconds with no state change, and reverts to the real state', async () => {
    const { user } = setup({ relays: { relay_01: { name: 'Ceiling lights', state: false } } })
    await user.click(segment('Ceiling lights', 'On'))

    advance(GIVE_UP_MS)

    expect(screen.getByText("Didn't switch")).toBeInTheDocument()
    expect(segment('Ceiling lights', 'Off')).toBeChecked()
    expect(segment('Ceiling lights', 'On')).not.toBeChecked()
    expect(segment('Ceiling lights', 'On')).toBeEnabled()
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
  })

  it('retries a failed command by sending the same target again', async () => {
    const { user } = setup({ relays: { relay_01: { name: 'Ceiling lights', state: false } } })
    await user.click(segment('Ceiling lights', 'On'))
    advance(GIVE_UP_MS)
    onSetRelay.mockClear()

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(onSetRelay).toHaveBeenCalledExactlyOnceWith('relay_01', true)
    expect(screen.queryByText("Didn't switch")).not.toBeInTheDocument()
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('clears a failure when the state later changes on its own', async () => {
    const { user, rerender } = setup({
      relays: { relay_01: { name: 'Ceiling lights', state: false } },
    })
    await user.click(segment('Ceiling lights', 'On'))
    advance(GIVE_UP_MS)

    rerender({ relays: { relay_01: { name: 'Ceiling lights', state: true } } })

    expect(screen.queryByText("Didn't switch")).not.toBeInTheDocument()
  })
})

describe('RelaysPage critical loads', () => {
  const critical = { criticalIds: ['relay_03'] }

  it('asks before switching a critical load and sends nothing until confirmed', async () => {
    const { user } = setup({ relays: { relay_03: PUMP }, ...critical })

    await user.click(segment('Water pump', 'On'))

    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/Water pump/)).toBeInTheDocument()
    expect(onSetRelay).not.toHaveBeenCalled()
  })

  it('sends the command once the confirmation is accepted', async () => {
    const { user } = setup({ relays: { relay_03: PUMP }, ...critical })
    await user.click(segment('Water pump', 'On'))

    await user.click(screen.getByRole('button', { name: 'Switch on' }))

    expect(onSetRelay).toHaveBeenCalledExactlyOnceWith('relay_03', true)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('leaves the load unchanged when the confirmation is cancelled', async () => {
    const { user } = setup({ relays: { relay_03: PUMP }, ...critical })
    await user.click(segment('Water pump', 'On'))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onSetRelay).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(segment('Water pump', 'Off')).toBeChecked()
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
  })

  it('returns focus to the control that opened the confirmation', async () => {
    const { user } = setup({ relays: { relay_03: PUMP }, ...critical })
    await user.click(segment('Water pump', 'On'))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(control('Water pump').contains(document.activeElement)).toBe(true)
  })

  it('closes the confirmation and sends nothing if the Node drops while it is open', async () => {
    const { user, rerender } = setup({ relays: { relay_03: PUMP }, ...critical })
    await user.click(segment('Water pump', 'On'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    rerender({ nodeOnline: false })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onSetRelay).not.toHaveBeenCalled()
  })

  it('shows no stale target or failure when the Node returns after a dropped confirmation', async () => {
    const { user, rerender } = setup({ relays: { relay_03: PUMP }, ...critical })
    await user.click(segment('Water pump', 'On'))
    rerender({ nodeOnline: false })
    rerender({ nodeOnline: true })
    advance(GIVE_UP_MS)

    expect(screen.queryByText("Didn't switch")).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
    expect(segment('Water pump', 'Off')).toBeChecked()
  })

  it('asks before switching a critical load off too', async () => {
    const { user } = setup({
      relays: { relay_03: { name: 'Water pump', state: true } },
      ...critical,
    })

    await user.click(segment('Water pump', 'Off'))

    expect(screen.getByRole('button', { name: 'Switch off' })).toBeInTheDocument()
    expect(onSetRelay).not.toHaveBeenCalled()
  })
})

describe('RelaysPage when the relay Node is not online', () => {
  it('reads every relay as Unknown with neither segment selected and every control disabled', () => {
    setup({ relays: { relay_01: LIGHTS, relay_03: PUMP }, nodeOnline: false })

    for (const name of ['Ceiling lights', 'Water pump']) {
      expect(segment(name, 'On')).not.toBeChecked()
      expect(segment(name, 'Off')).not.toBeChecked()
      expect(segment(name, 'On')).toBeDisabled()
      expect(segment(name, 'Off')).toBeDisabled()
    }
    expect(screen.getAllByText('Unknown')).toHaveLength(2)
  })

  it('explains why with one banner, not one message per relay', () => {
    setup({ relays: { relay_01: LIGHTS, relay_03: PUMP }, nodeOnline: false })

    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent(/relay node/i)
  })

  it('shows no banner while the Node is online', () => {
    setup({ relays: { relay_01: LIGHTS } })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('reads a relay that has a name but no state yet as Unknown, even with the Node online', () => {
    setup({ relays: { relay_03: { name: 'Water pump' } } })

    expect(segment('Water pump', 'On')).not.toBeChecked()
    expect(segment('Water pump', 'Off')).not.toBeChecked()
    expect(segment('Water pump', 'On')).toBeDisabled()
  })

  it('cancels a command in flight when the Node drops, so no stale target is shown', async () => {
    const { user, rerender } = setup({
      relays: { relay_01: { name: 'Ceiling lights', state: false } },
    })
    await user.click(segment('Ceiling lights', 'On'))

    rerender({ nodeOnline: false })

    expect(segment('Ceiling lights', 'On')).not.toBeChecked()
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
  })
})

describe('RelaysPage in Demo mode', () => {
  it('disables every control with nothing selected and says why', () => {
    setup({ relays: { relay_01: LIGHTS, relay_03: PUMP }, demo: true })

    for (const name of ['Ceiling lights', 'Water pump']) {
      expect(segment(name, 'On')).toBeDisabled()
      expect(segment(name, 'Off')).toBeDisabled()
      expect(segment(name, 'On')).not.toBeChecked()
      expect(segment(name, 'Off')).not.toBeChecked()
    }
    expect(screen.getByRole('status')).toHaveTextContent(/demo mode/i)
    expect(screen.getByRole('status')).toHaveTextContent(/disabled/i)
  })

  it('never sends a command, even when a control is tapped', async () => {
    const { user } = setup({ relays: { relay_01: LIGHTS }, demo: true })

    await user.click(segment('Ceiling lights', 'Off'))

    expect(onSetRelay).not.toHaveBeenCalled()
  })

  it('explains Demo mode rather than the relay Node, even while the demo Node is online', () => {
    setup({ relays: { relay_01: LIGHTS }, demo: true, nodeOnline: true })

    expect(screen.getAllByRole('status')).toHaveLength(1)
  })
})

describe('RelaysPage with no relays', () => {
  it('says it is waiting instead of rendering an empty page', () => {
    setup({ relays: {} })

    expect(screen.getByText(/no relays/i)).toBeInTheDocument()
  })
})
