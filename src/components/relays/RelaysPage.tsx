import { useEffect, useRef, useState } from 'react'
import { AlertDialog, Button, Spinner, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { ToggleLeft } from 'lucide-react'
import { criticalRelayIds, FALLBACK_RELAY_ICON, panelsFor, relayIcons } from '@/config/relayPanels'
import type { Relay } from '@/types'

/** A command that has not changed the relay's state in this long is reported as failed. */
export const GIVE_UP_MS = 4000

export interface RelaysPageProps {
  relays: Record<string, Relay>
  /** Every Node that publishes `relay` is online (`relayNodesOnline`). False reads as Unknown. */
  nodeOnline: boolean
  /** Demo mode: show the relays, but every control is disabled and nothing is ever sent. */
  demo: boolean
  /** Sends the TARGET state to the relay's `set` topic. */
  onSetRelay: (id: string, on: boolean) => void
  /** Loads that ask before switching. Defaults to the dashboard's own configuration. */
  criticalIds?: readonly string[]
}

/**
 * What a command in flight shows. `pending` shows the tapped target with a spinner until the
 * retained `state` changes; `failed` means 4 seconds passed with no change, and the control is
 * back on the real state. `from` is the state at the tap: arrival of any other state ends it.
 */
type Phase =
  | { kind: 'pending'; to: boolean; from: boolean | undefined }
  | { kind: 'failed'; to: boolean }

/** Pending and failed commands per relay id, and the 4 second give-up. */
function useCommandPhases(
  relays: Record<string, Relay>,
  frozen: boolean,
  send: (id: string, on: boolean) => void,
) {
  const [phases, setPhases] = useState<Record<string, Phase>>({})
  const timers = useRef<Map<string, number>>(new Map())

  const clearTimer = (id: string) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }

  const drop = (id: string) => {
    clearTimer(id)
    setPhases((prev) => {
      const { [id]: _gone, ...rest } = prev
      return rest
    })
  }

  // The state arriving is what settles a command: pending ends when the state moves off `from`,
  // and a failure clears when the state later changes on its own.
  useEffect(() => {
    for (const [id, phase] of Object.entries(phases)) {
      const state = relays[id]?.state
      if (phase.kind === 'pending' && state !== phase.from) drop(id)
      if (phase.kind === 'failed' && state === phase.to) drop(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relays, phases])

  // A Node that drops, or Demo mode, ends every command in flight: no stale target stays shown.
  useEffect(() => {
    if (!frozen) return
    for (const id of [...timers.current.keys()]) clearTimer(id)
    setPhases({})
  }, [frozen])

  useEffect(
    () => () => {
      for (const id of [...timers.current.keys()]) clearTimer(id)
    },
    [],
  )

  const request = (id: string, to: boolean) => {
    clearTimer(id)
    setPhases((prev) => ({
      ...prev,
      [id]: { kind: 'pending', to, from: relays[id]?.state },
    }))
    const handle = window.setTimeout(() => {
      timers.current.delete(id)
      setPhases((prev) =>
        prev[id]?.kind === 'pending' ? { ...prev, [id]: { kind: 'failed', to } } : prev,
      )
    }, GIVE_UP_MS)
    timers.current.set(id, handle)
    send(id, to)
  }

  return { phases, request }
}

interface ChannelProps {
  id: string
  relay: Relay
  /** Node not online, or Demo mode: nothing selected, controls disabled. */
  frozen: boolean
  phase: Phase | undefined
  onPick: (to: boolean) => void
  /** Resends a failed command's target. */
  onRetry: (to: boolean) => void
}

function Channel({ id, relay, frozen, phase, onPick, onRetry }: ChannelProps) {
  const label = relay.name ?? id
  const Icon =
    relay.name === undefined ? FALLBACK_RELAY_ICON : (relayIcons[id] ?? FALLBACK_RELAY_ICON)
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
        <ToggleButton
          id="off"
          className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground flex-1"
        >
          Off
        </ToggleButton>
        <ToggleButton
          id="on"
          className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground flex-1"
        >
          <ToggleButtonGroup.Separator />
          On
        </ToggleButton>
      </ToggleButtonGroup>
      {unknown && <span className="text-muted text-xs">Unknown</span>}
      {failed && (
        <span className="text-danger flex items-center gap-3 text-xs">
          Didn&apos;t switch
          <Button size="sm" variant="ghost" onPress={() => onRetry(phase.to)}>
            Retry
          </Button>
        </span>
      )}
    </div>
  )
}

/** Banner for the one reason every relay reads Unknown or disabled. */
function Banner({ demo, nodeOnline }: { demo: boolean; nodeOnline: boolean }) {
  if (!demo && nodeOnline) return null
  return (
    <p role="status" className="bg-surface text-muted rounded-xl px-3 py-2 text-xs">
      {demo
        ? 'Demo mode: controls are disabled.'
        : 'The relay node is not online. Every relay is unknown and its controls are disabled.'}
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
  nodeOnline,
  demo,
  onSetRelay,
  criticalIds = criticalRelayIds,
}: RelaysPageProps) {
  const frozen = demo || !nodeOnline
  const { phases, request } = useCommandPhases(relays, frozen, onSetRelay)
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const ids = Object.keys(relays)

  if (ids.length === 0) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <ToggleLeft aria-hidden="true" className="text-muted size-5" />
        <h2 className="text-foreground text-lg font-semibold">No relays yet.</h2>
        <p className="text-muted text-sm">Waiting for the relay node to publish.</p>
      </section>
    )
  }

  const pick = (id: string, to: boolean) => {
    if (criticalIds.includes(id)) setConfirming({ id, label: relays[id].name ?? id, to })
    else request(id, to)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 pb-32">
      <Banner demo={demo} nodeOnline={nodeOnline} />
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
                frozen={frozen}
                phase={phases[id]}
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
