import { useState, type FormEvent } from 'react'
import { Button } from '@heroui/react'
import { Bluetooth } from 'lucide-react'
import { readStorage, writeStorage } from '@/hooks/useStoredState'
import { getBluetooth, wakeHub, type BleApi, type WakeStatus } from '@/lib/bleWake'

const SECRET_KEY = 'renewvan-wake-secret'

type Phase =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; status: WakeStatus }
  | { kind: 'error'; message: string }

export interface WakePageProps {
  /** Injected in tests; the browser's Web Bluetooth otherwise (null where there is none). */
  bluetooth?: BleApi | null
}

/** What the person is told once the board answered, or why it could not be reached. */
function describe(phase: Phase): string | null {
  if (phase.kind === 'done') {
    return phase.status === 'on'
      ? 'Hub power is on. The Pi and router are starting: give them a minute or two, then open the dashboard.'
      : 'The board answered but did not switch on. Check the secret: three wrong tries in a row lock it for a minute.'
  }
  return phase.kind === 'error' ? phase.message : null
}

/**
 * The parked-van wake screen: one button that finds the relay board over Bluetooth and powers the
 * hub on. It is rendered INSTEAD of the app (see `main.tsx`, `?page=wake`) and touches nothing but
 * Bluetooth: no hub, no broker, no API, so it works with the hub off, from the cached PWA shell.
 */
export function WakePage({ bluetooth = getBluetooth() }: WakePageProps) {
  const [secret, setSecret] = useState(() => readStorage(SECRET_KEY) ?? '')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setPhase({ kind: 'working' })
    try {
      const status = await wakeHub(secret, bluetooth)
      writeStorage(SECRET_KEY, secret)
      setPhase({ kind: 'done', status })
    } catch (error) {
      const name = error instanceof Error ? error.name : ''
      setPhase({
        kind: 'error',
        message:
          name === 'NotFoundError'
            ? 'No board was chosen. Stand closer to the van and try again.'
            : error instanceof Error
              ? error.message
              : 'Could not reach the board.',
      })
    }
  }

  const message = describe(phase)
  const working = phase.kind === 'working'

  return (
    <main
      data-testid="wake-page"
      className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-6 p-6"
    >
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-xl font-semibold">Wake the van</h1>
        <p className="text-muted text-sm">
          Powers the hub and router on over Bluetooth, for when the van has been parked with them
          off. Stand within a few metres of the van.
        </p>

        {bluetooth ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm">
              Wake secret
              <input
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                className="border-border bg-surface min-h-11 rounded-lg border px-3"
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              isDisabled={working}
              className="min-h-11 w-full"
            >
              <Bluetooth className="size-5" aria-hidden="true" />
              {working ? 'Connecting…' : 'Wake hub'}
            </Button>
          </form>
        ) : (
          <p role="alert" className="text-danger text-sm">
            This browser cannot use Bluetooth. Use Chrome on Android or a computer. On an iPhone,
            open this page in the Bluefy browser.
          </p>
        )}

        {message ? (
          <p
            role={phase.kind === 'error' ? 'alert' : 'status'}
            className={
              phase.kind === 'done' && phase.status === 'on' ? 'text-success' : 'text-danger'
            }
          >
            {message}
          </p>
        ) : null}
      </div>
    </main>
  )
}
