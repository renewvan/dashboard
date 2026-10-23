import { useEffect, useRef, useState } from 'react'
import { AlertDialog, Button, Spinner, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { ToggleLeft, type LucideIcon } from 'lucide-react'
import { criticalRelayIds, FALLBACK_RELAY_ICON, panelsFor, relayIcons } from '@/config/relayPanels'
import type { Relay } from '@/types'

/**
 * The two segments of every control. `min-h-11` is the 44px touch target
 * (docs/design-principles.md); the solid fill on the selected segment is required, because the
 * default faint tint makes a mostly-off van read as a wall of "Off".
 */
const SEGMENT_CLASS =
  'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground min-h-11 flex-1'
const SEGMENTS = [
  { key: 'off', text: 'Off' },
  { key: 'on', text: 'On' },
] as const

/** A command that has not changed the relay's state in this long is reported as failed. */
export const GIVE_UP_MS = 4000

export interface RelaysPageProps {
  relays: Record<string, Relay>
  /** Every Driver that publishes `relay` is online (`relayDriversOnline`). False reads as Unknown. */
  driverOnline: boolean
  /** Demo mode: show the relays, but every control is disabled and nothing is ever sent. */
  demo: boolean
  /** Sends the TARGET state to the relay's `set` topic. */
  onSetRelay: (id: string, on: boolean) => void
  /** Loads that ask before switching. Defaults to the dashboard's own configuration. */
  criticalIds?: readonly string[]
  /** Per-channel icons, only for a load the owner has named. Defaults to the dashboard's own. */
  icons?: Readonly<Record<string, LucideIcon>>
}

/**
 * What a command in flight shows. `pending` shows the tapped target with a spinner until the
 * retained `state` changes; `failed` means 4 seconds passed with no change, and the control is
 * back on the real state. `from` is the state at the tap: arrival of any other state ends it.
 */
type Phase =
  | { kind: 'pending'; to: boolean; from: boolean | undefined }
  | { kind: 'failed'; to: boolean }

/**
 * Pending and failed commands per relay id, and the 4 second give-up.
 *
 * Whether a stored phase still applies is derived at render from the relay's real `state`, not
 * synced by an effect: a pending command is over once the state moves off the value it was sent
 * from, and a failure is over once the state reaches the target on its own. The only effect is
 * the timers' cleanup.
 */
function useCommandPhases(
  relays: Record<string, Relay>,
  frozen: boolean,
  send: (id: string, on: boolean) => void,
  onFreeze: () => void,
) {
  const [phases, setPhases] = useState<Record<string, Phase>>({})
  const [wasFrozen, setWasFrozen] = useState(frozen)
  const timers = useRef<Map<string, number>>(new Map())

  const clearTimers = () => {
    for (const handle of timers.current.values()) window.clearTimeout(handle)
    timers.current.clear()
  }

  // A Driver that drops, or Demo mode, ends every command in flight and any open confirmation, so
  // no stale target, failure or pump prompt surfaces when it returns. Adjusting state while
  // rendering is React's way to reset on a change.
  if (frozen !== wasFrozen) {
    setWasFrozen(frozen)
    if (frozen) {
      setPhases({})
      onFreeze()
    }
  }

  useEffect(() => {
    if (frozen) clearTimers()
  }, [frozen])

  useEffect(() => clearTimers, [])

  const request = (id: string, to: boolean) => {
    // The page is disabled while frozen; this guards a confirmation that was already open.
    if (frozen) return
    window.clearTimeout(timers.current.get(id))
    setPhases((prev) => ({ ...prev, [id]: { kind: 'pending', to, from: relays[id]?.state } }))
    const handle = window.setTimeout(() => {
      timers.current.delete(id)
      setPhases((prev) =>
        prev[id]?.kind === 'pending' ? { ...prev, [id]: { kind: 'failed', to } } : prev,
      )
    }, GIVE_UP_MS)
    timers.current.set(id, handle)
    send(id, to)
  }

  /** The phase that still applies to a relay, or nothing once its state has settled it. */
  const phaseOf = (id: string): Phase | undefined => {
    const phase = phases[id]
    const state = relays[id]?.state
    if (phase?.kind === 'pending' && state !== phase.from) return undefined
    if (phase?.kind === 'failed' && state === phase.to) return undefined
    return phase
  }

  return { phaseOf, request }
}

interface ChannelProps {
  id: string
  relay: Relay
  /** The glyph for this channel: a configured one, else the neutral one. */
  Icon: LucideIcon
  /** Driver not online, or Demo mode: nothing selected, controls disabled. */
  frozen: boolean
  phase: Phase | undefined
  onPick: (to: boolean) => void
  /** Resends a failed command's target. */
  onRetry: (to: boolean) => void
}

function Channel({ id, relay, Icon, frozen, phase, onPick, onRetry }: ChannelProps) {
  const label = relay.name ?? id
  const known = relay.state !== undefined
  const unknown = frozen || !known
  const pending = !unknown && phase?.kind === 'pending'
  const failed = !unknown && phase?.kind === 'failed'
  // While pending the control shows the TARGET, so a tap is visibly acknowledged.
  const shown = pending ? phase.to : relay.state
  const selected = unknown || shown === undefined ? [] : [shown ? 'on' : 'off']

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <Icon aria-hidden="true" className="text-muted size-4 shrink-0" />
          <span className={`truncate text-sm ${relay.name === undefined ? 'text-muted' : ''}`}>
            {label}
          </span>
        </span>
        {pending && <Spinner size="sm" />}
      </div>
      <ToggleButtonGroup
        aria-label={label}
        fullWidth
        selectionMode="single"
        disallowEmptySelection
        isDisabled={unknown || pending}
        selectedKeys={new Set(selected)}
        onSelectionChange={(keys) => {
          const key = [...keys][0]
          if (key === undefined) return
          const to = key === 'on'
          // HeroUI re-fires the selection on a re-tap of the selected segment: send nothing.
          if (to !== relay.state) onPick(to)
        }}
      >
        {SEGMENTS.map(({ key, text }, index) => (
          <ToggleButton key={key} id={key} className={SEGMENT_CLASS}>
            {index > 0 && <ToggleButtonGroup.Separator />}
            {text}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {unknown && <span className="text-muted text-xs">Unknown</span>}
      {failed && (
        <span className="text-danger flex items-center gap-3 text-xs">
          Didn&apos;t switch
          <Button size="sm" variant="ghost" className="min-h-11" onPress={() => onRetry(phase.to)}>
            Retry
          </Button>
        </span>
      )}
    </div>
  )
}

/** Banner for the one reason every relay reads Unknown or disabled. */
function Banner({ demo, driverOnline }: { demo: boolean; driverOnline: boolean }) {
  if (!demo && driverOnline) return null
  return (
    <p role="status" className="bg-surface text-muted rounded-xl px-3 py-2 text-xs">
      {demo
        ? 'Demo mode: controls are disabled.'
        : 'The relay driver is not online. Every relay is unknown and its controls are disabled.'}
    </p>
  )
}

interface Confirming {
  id: string
  label: string
  to: boolean
}

/**
 * The Relays page: titled panels of labelled Off | On controls, one per channel. `state` means
 * the output was commanded and latched, never that the load is energised, so the page never says
 * a load is "on" in that sense and never claims more than the bus does (hub ADR 0013).
 */
export function RelaysPage({
  relays,
  driverOnline,
  demo,
  onSetRelay,
  criticalIds = criticalRelayIds,
  icons = relayIcons,
}: RelaysPageProps) {
  const frozen = demo || !driverOnline
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const { phaseOf, request } = useCommandPhases(relays, frozen, onSetRelay, () =>
    setConfirming(null),
  )
  const ids = Object.keys(relays)

  if (ids.length === 0) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <ToggleLeft aria-hidden="true" className="text-muted size-5" />
        <h2 className="text-foreground text-lg font-semibold">No relays yet.</h2>
        <p className="text-muted text-sm">Waiting for the relay driver to publish.</p>
      </section>
    )
  }

  const pick = (id: string, to: boolean) => {
    if (criticalIds.includes(id)) setConfirming({ id, label: relays[id].name ?? id, to })
    else request(id, to)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
      <Banner demo={demo} driverOnline={driverOnline} />
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3">
        {panelsFor(ids).map((panel) => (
          <section
            key={panel.title}
            aria-label={panel.title}
            className="bg-surface border-border flex flex-col gap-4 rounded-2xl border p-4"
          >
            <h2 className="text-muted flex items-center gap-2 text-sm font-medium">
              <panel.icon aria-hidden="true" className="size-4 shrink-0" />
              {panel.title}
            </h2>
            {panel.ids.map((id) => (
              <Channel
                key={id}
                id={id}
                relay={relays[id]}
                Icon={icons[id] ?? FALLBACK_RELAY_ICON}
                frozen={frozen}
                phase={phaseOf(id)}
                onPick={(to) => pick(id, to)}
                onRetry={(to) => request(id, to)}
              />
            ))}
          </section>
        ))}
      </div>
      <AlertDialog
        isOpen={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null)
        }}
      >
        {/* The root is a React Aria DialogTrigger, which warns without a pressable child. This
            dialog is controlled by `confirming`, so the trigger is never pressed: it only
            satisfies the root, and is hidden so it adds no phantom button. */}
        <AlertDialog.Trigger aria-hidden="true" className="hidden" />
        <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>
                      Switch {confirming?.to ? 'on' : 'off'} {confirming?.label}?
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <Button variant="tertiary" onPress={close}>
                      Cancel
                    </Button>
                    <Button
                      onPress={() => {
                        if (confirming) request(confirming.id, confirming.to)
                        close()
                      }}
                    >
                      Switch {confirming?.to ? 'on' : 'off'}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  )
}
