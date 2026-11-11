import { useState, type FormEvent } from 'react'
import { Button, Input, Label, TextField } from '@heroui/react'
import { Bluetooth, Eye, EyeOff } from 'lucide-react'
import { BrandLockup } from '@/components/BrandLockup'
import { useHubReachable } from '@/hooks/useHubReachable'
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
  /** Injected in tests: how the page asks whether the hub is answering yet. */
  fetcher?: typeof fetch
  pollMs?: number
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
export function WakePage({
  bluetooth = getBluetooth(),
  fetcher = fetch,
  pollMs = 3000,
}: WakePageProps) {
  const [secret, setSecret] = useState(() => readStorage(SECRET_KEY) ?? '')
  const [show, setShow] = useState(false)
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
  const hubOn = phase.kind === 'done' && phase.status === 'on'
  const { reachable, gaveUp } = useHubReachable(hubOn, { fetcher, intervalMs: pollMs })
  const working = phase.kind === 'working'

  return (
    <main
      data-testid="wake-page"
      className="bg-background flex min-h-dvh flex-col items-center justify-center p-6 [@media(max-height:480px)]:py-3"
    >
      <div className="flex w-full max-w-sm flex-col gap-6 [@media(max-height:480px)]:gap-3">
        <div className="flex flex-col items-center gap-2 text-center [@media(max-height:480px)]:gap-1">
          <BrandLockup />
          <h1 className="text-xl font-bold [@media(max-height:480px)]:text-base">Wake the van</h1>
          <p className="text-muted text-sm [@media(max-height:480px)]:text-xs">
            Power up the hub and router over Bluetooth.
          </p>
        </div>

        {bluetooth ? (
          <form
            onSubmit={onSubmit}
            className="flex w-full flex-col gap-4 [@media(max-height:480px)]:gap-2"
          >
            <TextField value={secret} onChange={setSecret} className="flex flex-col gap-1">
              <Label>Wake secret</Label>
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  autoComplete="off"
                  className="min-h-9 w-full py-1 pr-12 text-sm"
                />
                <button
                  type="button"
                  aria-label={show ? 'Hide secret' : 'Show secret'}
                  onClick={() => setShow(!show)}
                  className="text-muted absolute inset-y-0 right-0 flex w-11 items-center justify-center"
                >
                  {show ? (
                    <EyeOff className="size-5" aria-hidden="true" />
                  ) : (
                    <Eye className="size-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </TextField>
            <Button
              type="submit"
              variant="primary"
              isDisabled={working}
              fullWidth
              className="w-full"
            >
              <Bluetooth className="size-5" aria-hidden="true" />
              {working ? 'Connecting…' : 'Wake hub'}
            </Button>
          </form>
        ) : (
          <p role="alert" className="text-danger text-center text-sm">
            This browser cannot use Bluetooth. Use Chrome on Android or a computer. On an iPhone,
            open this page in the Bluefy browser.
          </p>
        )}

        {message ? (
          <p
            role={phase.kind === 'error' ? 'alert' : 'status'}
            className={`text-center text-sm ${
              phase.kind === 'done' && phase.status === 'on' ? 'text-success' : 'text-danger'
            }`}
          >
            {message}
          </p>
        ) : null}

        {hubOn && reachable ? (
          <a
            href="/"
            className="bg-accent text-accent-foreground flex min-h-11 w-full items-center justify-center rounded-full px-4 font-semibold"
          >
            Open dashboard
          </a>
        ) : hubOn && !gaveUp ? (
          <p className="text-muted text-center text-sm">Waiting for the hub to answer…</p>
        ) : null}
      </div>
    </main>
  )
}
