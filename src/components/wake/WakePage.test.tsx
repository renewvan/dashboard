import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { WAKE_COMMAND, WAKE_STATUS, type BleApi } from '@/lib/bleWake'
import { WakePage } from './WakePage'

const text = (s: string) => new DataView(new TextEncoder().encode(s).buffer)

/** A board that answers every status read with `status`. */
function board(status: string): BleApi {
  const characteristics = {
    [WAKE_COMMAND]: {
      writeValueWithResponse: vi.fn(async () => {}),
      writeValue: vi.fn(),
      readValue: vi.fn(),
    },
    [WAKE_STATUS]: { writeValue: vi.fn(), readValue: vi.fn(async () => text(status)) },
  }
  return {
    requestDevice: async () => ({
      gatt: {
        connect: async () => ({
          getPrimaryService: async () => ({
            getCharacteristic: async (uuid: string) =>
              characteristics[uuid as keyof typeof characteristics],
          }),
          disconnect: () => {},
        }),
      },
    }),
  } as unknown as BleApi
}

describe('WakePage', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => window.localStorage.clear())

  it('says the browser cannot use Bluetooth, and offers no button, where there is none', () => {
    render(<WakePage bluetooth={null} />)
    expect(screen.getByRole('alert')).toHaveTextContent('cannot use Bluetooth')
    expect(screen.queryByRole('button', { name: /wake hub/i })).not.toBeInTheDocument()
  })

  it('wakes the hub with the typed secret and says the hub is on', async () => {
    const user = userEvent.setup()
    render(<WakePage bluetooth={board('on')} />)
    await user.type(screen.getByLabelText('Wake secret'), 'hunter2')
    await user.click(screen.getByRole('button', { name: /wake hub/i }))
    expect(await screen.findByRole('status')).toHaveTextContent('Hub power is on')
  })

  it('remembers the secret on this device after a successful wake', async () => {
    const user = userEvent.setup()
    const first = render(<WakePage bluetooth={board('on')} />)
    await user.type(screen.getByLabelText('Wake secret'), 'hunter2')
    await user.click(screen.getByRole('button', { name: /wake hub/i }))
    await screen.findByRole('status')
    first.unmount()
    render(<WakePage bluetooth={board('on')} />)
    expect(screen.getByLabelText('Wake secret')).toHaveValue('hunter2')
  })

  it('tells the person to check the secret when the board did not switch on', async () => {
    const user = userEvent.setup()
    render(<WakePage bluetooth={board('off')} />)
    await user.type(screen.getByLabelText('Wake secret'), 'wrong')
    await user.click(screen.getByRole('button', { name: /wake hub/i }))
    expect(await screen.findByRole('status')).toHaveTextContent('did not switch on')
  })

  it('asks for the secret instead of opening the chooser when it is empty', async () => {
    const user = userEvent.setup()
    render(<WakePage bluetooth={board('on')} />)
    await user.click(screen.getByRole('button', { name: /wake hub/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the wake secret')
  })

  it('reads a cancelled chooser as "no board chosen"', async () => {
    const user = userEvent.setup()
    const cancelled = Object.assign(new Error('cancelled'), { name: 'NotFoundError' })
    const bluetooth = { requestDevice: vi.fn().mockRejectedValue(cancelled) } as unknown as BleApi
    render(<WakePage bluetooth={bluetooth} />)
    await user.type(screen.getByLabelText('Wake secret'), 'hunter2')
    await user.click(screen.getByRole('button', { name: /wake hub/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No board was chosen')
  })

  async function wake(fetcher: typeof fetch) {
    const user = userEvent.setup()
    render(<WakePage bluetooth={board('on')} fetcher={fetcher} pollMs={10} />)
    await user.type(screen.getByLabelText('Wake secret'), 'hunter2')
    await user.click(screen.getByRole('button', { name: /wake hub/i }))
  }

  it('waits for the hub after waking it, then offers to open the dashboard', async () => {
    const answers = [new TypeError('offline'), { status: 502 }, { status: 401 }]
    const fetcher = vi.fn(async () => {
      const next = answers.shift() ?? { status: 401 }
      if (next instanceof Error) throw next
      return next as Response
    })
    await wake(fetcher as unknown as typeof fetch)
    expect(await screen.findByText(/Waiting for the hub/)).toBeInTheDocument()
    const link = await screen.findByRole('link', { name: 'Open dashboard' })
    expect(link).toHaveAttribute('href', '/')
    expect(screen.queryByText(/Waiting for the hub/)).not.toBeInTheDocument()
  })

  it('does not poll, or offer the dashboard, when the board did not switch on', async () => {
    const fetcher = vi.fn(async () => ({ status: 204 }) as Response)
    const user = userEvent.setup()
    render(<WakePage bluetooth={board('off')} fetcher={fetcher} pollMs={10} />)
    await user.type(screen.getByLabelText('Wake secret'), 'wrong')
    await user.click(screen.getByRole('button', { name: /wake hub/i }))
    await screen.findByRole('status')
    await new Promise((r) => setTimeout(r, 50))
    expect(fetcher).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: 'Open dashboard' })).not.toBeInTheDocument()
  })
})
