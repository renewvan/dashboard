import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  AlertDialog,
  Button,
  Card,
  Label,
  Spinner,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  toast,
} from '@heroui/react'
import {
  Fan,
  Gauge,
  Heater as HeaterIcon,
  Info,
  Thermometer,
  ThermometerSun,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import {
  OPERATING_MODES,
  POWER_RANGE,
  SETPOINT_RANGE,
  canChangeSettings,
  modeSwitchBlock,
  type HeaterTimer,
  canStart,
  canStop,
  hasError,
  heaterSensor,
  isReporting,
  operatingMode,
  phaseLabel,
  statusLine,
  type HeaterSensor,
  type OperatingMode,
} from '@/lib/heater'
import type { Heater, HeaterMode } from '@/types'
import { useIsMobile } from '@/hooks/use-media-query'
import { DialSlider } from './DialSlider'
import { HeaterReadings } from './HeaterReadings'
import { Carousel } from '../start/Carousel'
import { RunTime } from './RunTime'
import { TimerHeader, TimerPicker } from './TimerPicker'
/**
 * A command that has not changed its retained field in this long is reported as failed. Longer than
 * the relay's 4 s: a settings write is only confirmed by the Driver's next settings read (hub ADR 0021).
 */
export const GIVE_UP_MS = 6000

/** The toast title for a command the heater never confirmed. */
const FAILURE_TITLES: Record<Field, string> = {
  setpoint: "Target didn't change",
  power: "Power didn't change",
  mode: "Mode didn't change",
  run: "Heater didn't respond",
}

export interface HeaterPageProps {
  heaters: Record<string, Heater>
  /** Every Driver that publishes `heater` is online (`heaterDriversOnline`). False reads as Unknown. */
  driverOnline: boolean
  /** Demo mode: show the heaters, but every control is disabled and nothing is ever sent. */
  demo: boolean
  onSetRunning: (id: string, run: boolean) => void
  onSetMode: (id: string, mode: HeaterMode) => void
  /** Ventilation is not a `mode` value: `true` starts fan-only from off. */
  onSetVentilating: (id: string, on: boolean) => void
  onSetSetpoint: (id: string, celsius: number) => void
  onSetPowerLevel: (id: string, level: number) => void
  /** Turns the Driver's `commands_enabled` on or off: the switch in the dial card's header. */
  onSetCommandsEnabled: (id: string, enabled: boolean) => void
  /**
   * Dev only (the local heater): every operating mode can be picked, because the page then owns
   * the mode. Absent on a real heater, where Power, Temperature and Ventilation are commandable.
   */
  localModes?: {
    mode: OperatingMode
    onChange: (mode: OperatingMode, sensor: HeaterSensor) => void
    /**
     * The Autoterm-style timer (On in starts the heater, Off in stops it). The hub and Driver have no
     * timer field, so it only works on the local heater; on a real heater the pickers are disabled.
     */
    timer?: HeaterTimer
  }
}

/** The four things a card can command; each is confirmed by its own retained field changing. */
type Field = 'run' | 'mode' | 'setpoint' | 'power'
interface Pending {
  /** The value the retained field had at the tap: any other value ends the wait. */
  from: unknown
  /** The number sent, for a dial that shows its target while the heater catches up. */
  to?: number
  failed: boolean
}

const OPERATING_MODE_ICONS: Record<OperatingMode, LucideIcon> = {
  power: Gauge,
  temperature: Thermometer,
  ventilation: Fan,
  heat_ventilation: HeaterIcon,
  thermostat: ThermometerSun,
}

/** The retained value that confirms each command. A start or stop is confirmed by the phase moving. */
function observed(heater: Heater, field: Field): unknown {
  switch (field) {
    case 'run':
      return heater.phase
    case 'mode':
      return heater.mode
    case 'setpoint':
      return heater.setpoint_c
    case 'power':
      return heater.power_level
  }
}

/**
 * Pending and failed commands for one heater. Whether a stored entry still applies is derived at
 * render from the heater's real fields (it is over once the field leaves the value it was sent
 * from), so the only effect is the timers' cleanup.
 */
function useCommands(heater: Heater, frozen: boolean) {
  const [pending, setPending] = useState<Partial<Record<Field, Pending>>>({})
  const [wasFrozen, setWasFrozen] = useState(frozen)
  const timers = useRef<Map<Field, number>>(new Map())
  // The heater as of the latest render, so a timer can tell whether the heater has answered since.
  const latest = useRef(heater)
  useEffect(() => {
    latest.current = heater
  })

  const clearTimers = () => {
    for (const handle of timers.current.values()) window.clearTimeout(handle)
    timers.current.clear()
  }
  // A Driver that drops, or Demo mode, ends every command in flight.
  if (frozen !== wasFrozen) {
    setWasFrozen(frozen)
    if (frozen) setPending({})
  }
  useEffect(() => {
    if (frozen) clearTimers()
  }, [frozen])
  useEffect(() => clearTimers, [])

  const send = (field: Field, action: () => void, to?: number) => {
    if (frozen) return
    window.clearTimeout(timers.current.get(field))
    const from = observed(heater, field)
    setPending((prev) => ({ ...prev, [field]: { from, to, failed: false } }))
    timers.current.set(
      field,
      window.setTimeout(() => {
        timers.current.delete(field)
        // The heater moved on while the timer ran: it answered, so there is nothing to report.
        if (observed(latest.current, field) !== from) return
        setPending((prev) =>
          prev[field] ? { ...prev, [field]: { ...prev[field], failed: true } } : prev,
        )
        toast.danger(FAILURE_TITLES[field], { description: heater.name })
      }, GIVE_UP_MS),
    )
    action()
  }

  /** The entry that still applies to a field, or nothing once the heater has answered. */
  const stateOf = (field: Field): Pending | undefined => {
    const entry = pending[field]
    if (entry === undefined) return undefined
    if (!entry.failed && observed(heater, field) !== entry.from) return undefined
    return entry
  }

  return { send, stateOf }
}

/** The heater's name and what it is doing, as one row. */
function HeaterTitle({
  label,
  status,
  commands,
}: {
  label: string
  status: string | undefined
  /** When given, the status is replaced by the controls switch. */
  commands?: { on: boolean; disabled: boolean; onChange: (on: boolean) => void }
}) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2">
      <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
        <HeaterIcon aria-hidden="true" className="text-muted size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </h2>
      {commands ? (
        <div className="flex items-center gap-2">
          {/* The dial shows the phase; only "Unknown" (not reporting) is worth keeping up here. */}
          {commands.disabled && <span className="text-sm font-semibold">{status}</span>}
          <Switch
            isSelected={commands.on}
            isDisabled={commands.disabled}
            onChange={commands.onChange}
          >
            <Switch.Content>
              <Label className="sr-only">{`${label} controls`}</Label>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </div>
      ) : (
        <span className="text-sm font-semibold">{status}</span>
      )}
    </div>
  )
}

interface CardProps extends Omit<HeaterPageProps, 'heaters' | 'driverOnline' | 'demo'> {
  id: string
  heater: Heater
  frozen: boolean
  /** The page's two cards (default), or the Start page's widget: one carousel card. */
  variant?: 'page' | 'widget'
}

const CARD_CLASS = 'min-h-0 gap-0! overflow-hidden p-0!'
/** Both cards' header row: one place for its padding, in line with the content's side padding. */
const HEADER_CLASS = 'flex-row! items-center justify-between gap-2 px-4 py-3 max-md:py-2.5'
/** On a phone Start/Stop lives in the dial card, so this card ends with its readings and notes: more room above and below. */
const CONTENT_CLASS = 'min-h-0 flex-1 gap-4 px-4 pb-3 max-md:pt-3 max-md:pb-5'
/** The dial card is tighter than the status card: the dial gets what the padding gives back. */
const DIAL_CONTENT_CLASS = 'min-h-0 flex-1 gap-2 overflow-y-auto p-3 pt-0 max-md:px-4'

/**
 * One heater as two cards: the dial that sets what it should do (left) and what it is doing
 * (right). The dial drives the target temperature, or the power level in the fixed-power mode,
 * the only setting that mode reads.
 */
export function HeaterCard({
  id,
  heater,
  frozen,
  variant = 'page',
  onSetRunning,
  onSetMode,
  onSetVentilating,
  onSetSetpoint,
  onSetPowerLevel,
  onSetCommandsEnabled,
  localModes,
}: CardProps) {
  const label = heater.name ?? id
  const reporting = !frozen && isReporting(heater)
  const { send, stateOf } = useCommands(heater, frozen || !reporting)
  const isMobile = useIsMobile()
  const [confirmingStart, setConfirmingStart] = useState(false)
  // A mode the heater cannot switch to while it runs: asked about, then reached after a stop.
  const [switchTarget, setSwitchTarget] = useState<OperatingMode | null>(null)
  const afterStop = useRef<OperatingMode | null>(null)

  const commandsOn = heater.commands_enabled === true
  const controls = reporting && commandsOn
  const settingsOk = controls && canChangeSettings(heater)
  const run = stateOf('run')
  const mode = stateOf('mode')
  // Ventilation is chosen first and started by Start: the hub has no `mode` for it, so the choice
  // is held here until then (it only stands while the heater is off).
  const [ventilationChosen, setVentilationChosen] = useState(false)
  const armed = ventilationChosen && heater.phase === 'off'
  // Once the heater leaves off (started from here, the panel or anywhere else) the choice is spent,
  // so a later Start never runs the fan on a choice made before that run.
  useEffect(() => {
    if (heater.phase !== 'off') setVentilationChosen(false)
  }, [heater.phase])
  const current = localModes?.mode ?? (armed ? 'ventilation' : operatingMode(heater))
  // The sensor a switch back to Temperature resumes: the one in use, else the last one seen.
  const [lastSensor, setLastSensor] = useState<HeaterSensor>('heater_temperature')
  const inUse = heaterSensor(heater)
  if (inUse !== undefined && inUse !== lastSensor) setLastSensor(inUse)
  const sensor = inUse ?? lastSensor
  // Modes can be asked for even while ventilating (the heater then offers to stop first), so only a
  // shutdown or an unanswered mode change holds them back.
  const modesOk = controls && heater.phase !== 'shutting_down'
  const applyMode = (next: OperatingMode) => {
    if (localModes) return localModes.onChange(next, sensor)
    setVentilationChosen(next === 'ventilation')
    // The hub's `mode` is Power or a sensor, so Temperature resumes the last sensor.
    if (next === 'power') send('mode', () => onSetMode(id, 'power'))
    if (next === 'temperature') send('mode', () => onSetMode(id, sensor))
    // Ventilation changes no `mode` field: Start sends it (see the start confirmation).
  }
  // The stop the prompt asked for went through: now reach the mode it was for.
  const runFailed = run?.failed === true
  useEffect(() => {
    const target = afterStop.current
    if (target === null) return
    if (runFailed) afterStop.current = null
    else if (heater.phase === 'off') {
      afterStop.current = null
      applyMode(target)
    }
    // `applyMode` is rebuilt every render and reads only what the render supplied.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heater.phase, runFailed])
  // Ventilation, like Power, is set by a power level (Venus: the level shows in both).
  const byPower = current === 'power' || current === 'ventilation'
  const dialField: Field = byPower ? 'power' : 'setpoint'
  const dial = stateOf(dialField)
  const dialBusy = dial !== undefined && !dial.failed
  const dialValue = byPower ? heater.power_level : heater.setpoint_c
  const phase = reporting ? phaseLabel(heater) : undefined
  // Warm while the flame is on or coming up, the theme accent otherwise, and always the accent in
  // Ventilation, where the fan runs and nothing burns.
  const heating =
    reporting &&
    current !== 'ventilation' &&
    (heater.phase === 'starting' || heater.phase === 'warming_up' || heater.phase === 'running')
  const tone = heating ? 'var(--warning)' : 'var(--accent)'
  const toneFg = heating ? 'var(--warning-foreground)' : 'var(--accent-foreground)'
  const cabin = reporting ? heater.internal_temperature_c : undefined

  // Start/Stop sits under the mode buttons on a phone, and at the foot of the status card on the kiosk.
  const line = statusLine(heater, current)
  // One info line, always right above Start/Stop; the reason the controls are off outranks the rest.
  const infoText =
    !reporting && !frozen
      ? 'No recent reading from the heater.'
      : reporting && !commandsOn
        ? 'Read-only! - Commands are turned off.'
        : line
  const infoLine =
    infoText !== undefined ? (
      <p className="text-muted flex items-center gap-2 pb-1 text-sm">
        <Info aria-hidden="true" className="size-4 shrink-0" />
        {infoText}
      </p>
    ) : null
  // On the phone page and the widget the info line leads the mode buttons; on the kiosk it sits
  // right above Start/Stop.
  const infoAboveModes = isMobile || variant === 'widget'
  const startStop = (
    <div className="flex flex-col gap-1">
      {!infoAboveModes && infoLine}
      <div className="flex items-center gap-3">
        {canStop(heater) ? (
          <Button
            variant="danger"
            className="min-h-11 flex-1"
            isDisabled={!controls || (run !== undefined && !run.failed)}
            onPress={() => send('run', () => onSetRunning(id, false))}
          >
            Stop
          </Button>
        ) : (
          <Button
            className="min-h-11 flex-1"
            isDisabled={!controls || !canStart(heater) || (run !== undefined && !run.failed)}
            onPress={() => setConfirmingStart(true)}
          >
            Start
          </Button>
        )}
        {run && !run.failed && <Spinner size="sm" />}
      </div>
      {controls && heater.phase === 'off' && hasError(heater) && (
        <span className="text-muted text-xs">Can&apos;t start with a fault.</span>
      )}
    </div>
  )

  const dialSlider = (
    <DialSlider
      label={byPower ? 'Power' : 'Target'}
      value={dialBusy && dial.to !== undefined ? dial.to : dialValue}
      min={byPower ? POWER_RANGE.min : SETPOINT_RANGE.min}
      max={byPower ? POWER_RANGE.max : SETPOINT_RANGE.max}
      unit={byPower ? '' : '°C'}
      tone={tone}
      status={phase}
      marker={byPower ? undefined : cabin}
      reading={cabin === undefined ? undefined : `${cabin.toFixed(1)} °C`}
      disabled={!settingsOk}
      busy={dialBusy}
      onCommit={(to) =>
        byPower
          ? send('power', () => onSetPowerLevel(id, to), to)
          : send('setpoint', () => onSetSetpoint(id, to), to)
      }
    />
  )

  const modeButtons = (
    <ToggleButtonGroup
      aria-label={`${label} mode`}
      fullWidth
      selectionMode="single"
      disallowEmptySelection
      isDisabled={!modesOk || mode !== undefined}
      selectedKeys={new Set(current === undefined ? [] : [current])}
      onSelectionChange={(keys) => {
        const next = [...keys][0] as OperatingMode | undefined
        // HeroUI re-fires the selection on a re-tap of the selected segment: send nothing.
        if (next === undefined || next === current) return
        // Ventilation and the heating modes exclude each other while the heater runs.
        if (modeSwitchBlock(heater, current, next) !== undefined) {
          setSwitchTarget(next)
          return
        }
        applyMode(next)
      }}
    >
      {OPERATING_MODES.map(({ key, label: modeLabel, supported }) => {
        const ModeIcon = OPERATING_MODE_ICONS[key]
        return (
          <ToggleButton
            key={key}
            id={key}
            aria-label={modeLabel}
            isDisabled={!supported && !localModes}
            className="min-h-11 flex-1 data-[selected=true]:bg-[var(--tone)] data-[selected=true]:text-[var(--tone-fg)]"
          >
            {({ isSelected }) => (
              <>
                <ModeIcon aria-hidden="true" className="size-5 shrink-0" />
                {/* The current mode is named; the others are icons to save the width. */}
                {isSelected && <span className="truncate text-sm font-medium">{modeLabel}</span>}
              </>
            )}
          </ToggleButton>
        )
      })}
    </ToggleButtonGroup>
  )

  const readings = (
    <>
      {reporting && hasError(heater) && (
        <p
          role="alert"
          className="bg-danger/10 text-danger flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
        >
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          Heater fault, error {heater.error_code}
        </p>
      )}
    </>
  )

  // The page's sensor readings, as plain content (Settings › Heater keeps a copy).
  const readoutsList = (
    <dl aria-label={`${label} readings`} className="grid grid-cols-2 gap-x-4 gap-y-2">
      <HeaterReadings heater={heater} reporting={reporting} />
      {/* The clock the Start button starts, as on Venus OS: only the Start widget shows it. */}
      {variant === 'widget' && <RunTime heater={heater} reporting={reporting} />}
    </dl>
  )

  const timerHeader = (
    <Card.Header className={`${HEADER_CLASS} mb-0 pb-2!`}>
      <TimerHeader timer={localModes?.timer} disabled={!controls} />
    </Card.Header>
  )

  const dialogs = (
    <>
      <AlertDialog isOpen={confirmingStart} onOpenChange={setConfirmingStart}>
        {/* Controlled by `confirmingStart`; the root is a DialogTrigger that warns without a
            pressable child, so a hidden trigger satisfies it (same as the Relays page). */}
        <AlertDialog.Trigger aria-hidden="true" className="hidden" />
        <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>
                      {armed ? `Start ventilation on ${label}?` : `Start ${label}?`}
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  {armed && <AlertDialog.Body>The fan runs and nothing burns.</AlertDialog.Body>}
                  <AlertDialog.Footer>
                    <Button variant="tertiary" onPress={close}>
                      Cancel
                    </Button>
                    <Button
                      onPress={() => {
                        if (armed) {
                          setVentilationChosen(false)
                          send('run', () => onSetVentilating(id, true))
                        } else send('run', () => onSetRunning(id, true))
                        close()
                      }}
                    >
                      {armed ? 'Start ventilation' : 'Start'}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* Venus-style: the mode cannot be reached while the heater runs, so offer the stop it needs. */}
      <AlertDialog
        isOpen={switchTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSwitchTarget(null)
        }}
      >
        <AlertDialog.Trigger aria-hidden="true" className="hidden" />
        <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>
                      Switch to {OPERATING_MODES.find((m) => m.key === switchTarget)?.label}?
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    {switchTarget !== null && modeSwitchBlock(heater, current, switchTarget)} Stop
                    the heater first?
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="tertiary" onPress={close}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onPress={() => {
                        afterStop.current = switchTarget
                        send('run', () => onSetRunning(id, false))
                        close()
                      }}
                    >
                      Stop heater
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  )

  if (variant === 'widget') {
    // The Start page's widget: one card headed by the heater's name and status, then a carousel of
    // the dial (with the modes and Start/Stop) and the readings. Only the first card's header is
    // used; the readings carry none.
    return (
      <>
        <Card
          aria-label={`${label} widget`}
          className="shrink-0 gap-0! p-0!"
          style={{ '--tone': tone, '--tone-fg': toneFg } as CSSProperties}
        >
          <Card.Header className={HEADER_CLASS}>
            <HeaterTitle
              label={label}
              status={reporting ? phase : 'Unknown'}
              commands={{
                on: commandsOn,
                disabled: frozen || !reporting,
                onChange: (on) => onSetCommandsEnabled(id, on),
              }}
            />
          </Card.Header>
          <Card.Content className="px-0 pb-5">
            <Carousel
              label={label}
              slides={[
                {
                  id: 'dial',
                  label: 'Setting',
                  content: (
                    <div className="flex w-full flex-col gap-2 px-4 pb-4">
                      {dialSlider}
                      {infoLine}
                      {modeButtons}
                      {startStop}
                    </div>
                  ),
                },
                {
                  id: 'readings',
                  label: 'Readings',
                  content: (
                    <div className="flex w-full flex-col gap-3 self-start pb-4">
                      {timerHeader}
                      <div className="flex flex-col gap-3 px-4">
                        <TimerPicker timer={localModes?.timer} disabled={!controls} />
                        {readings}
                        {readoutsList}
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Card.Content>
        </Card>
        {dialogs}
      </>
    )
  }

  return (
    <>
      <Card
        aria-label={`${label} setting`}
        className={CARD_CLASS}
        style={{ '--tone': tone, '--tone-fg': toneFg } as CSSProperties}
      >
        {/* The dial card leads with the heater's name and status, on the kiosk as on a phone. The
            readings card is titled only on a phone, where the cards stack. */}
        <Card.Header className={HEADER_CLASS}>
          <HeaterTitle
            label={label}
            status={reporting ? phase : 'Unknown'}
            commands={{
              on: commandsOn,
              // Frozen or not reporting: nothing would answer the change.
              disabled: frozen || !reporting,
              onChange: (on) => onSetCommandsEnabled(id, on),
            }}
          />
        </Card.Header>
        <Card.Content className={DIAL_CONTENT_CLASS}>
          {dialSlider}
          {/* Bottom-anchored, on the same line as the status card's Start/Stop. */}
          <div className="mt-auto flex flex-col gap-3">
            {infoAboveModes && infoLine}
            {modeButtons}
            {isMobile && startStop}
          </div>
        </Card.Content>
      </Card>

      <Card aria-label={`${label} status`} className={CARD_CLASS}>
        {timerHeader}
        <Card.Content className={CONTENT_CLASS}>
          <TimerPicker timer={localModes?.timer} disabled={!controls} />
          {/* Only this part scrolls (the readings can outgrow a short card); Start/Stop below stays put. */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            {readings}
            {readoutsList}
          </div>

          {!isMobile && <div className="shrink-0">{startStop}</div>}
        </Card.Content>
      </Card>

      {dialogs}
    </>
  )
}

/** Banner for the one reason every heater reads Unknown or disabled. */
function Banner({ demo, driverOnline }: { demo: boolean; driverOnline: boolean }) {
  if (!demo && driverOnline) return null
  return (
    <p role="status" className="bg-surface text-muted rounded-xl px-3 py-2 text-xs">
      {demo
        ? 'Demo mode: controls are disabled.'
        : 'The heater driver is not online. The heater is unknown and its controls are disabled.'}
    </p>
  )
}

/**
 * The Heater page: one card per heater with its phase, readings and controls. The page claims no
 * more than the bus does: a command shows pending until the retained field changes, and a heater
 * whose Driver is down, or whose live fields are cleared, reads Unknown rather than off (hub ADR
 * 0021). Controls need the Driver's own `commands_enabled`.
 */
export function HeaterPage({ heaters, driverOnline, demo, ...commands }: HeaterPageProps) {
  const frozen = demo || !driverOnline
  const ids = Object.keys(heaters).sort()

  if (ids.length === 0) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <HeaterIcon aria-hidden="true" className="text-muted size-5" />
        <h2 className="text-foreground text-lg font-semibold">No heater yet.</h2>
        <p className="text-muted text-sm">Waiting for the heater driver to publish.</p>
      </section>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 max-md:pt-3">
      <Banner demo={demo} driverOnline={driverOnline} />
      <div
        className={`grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 ${
          ids.length === 1 ? 'md:min-h-0 md:flex-1 md:grid-rows-[minmax(0,1fr)]' : ''
        }`}
      >
        {ids.map((id) => (
          <HeaterCard key={id} id={id} heater={heaters[id]} frozen={frozen} {...commands} />
        ))}
      </div>
    </div>
  )
}
