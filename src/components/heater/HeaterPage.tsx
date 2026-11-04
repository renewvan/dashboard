import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  AlertDialog,
  Button,
  Card,
  ListBox,
  Select,
  Spinner,
  ToggleButton,
  ToggleButtonGroup,
  toast,
} from '@heroui/react'
import {
  Fan,
  Gauge,
  Heater as HeaterIcon,
  Thermometer,
  ThermometerSun,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import {
  HEATER_SENSORS,
  MODE_LABELS,
  OPERATING_MODES,
  POWER_RANGE,
  SETPOINT_RANGE,
  canChangeSettings,
  modeSwitchBlock,
  sensorLocked,
  canStart,
  canStop,
  formatRuntime,
  hasError,
  heaterSensor,
  isReporting,
  operatingMode,
  phaseLabel,
  type HeaterSensor,
  type OperatingMode,
} from '@/lib/heater'
import type { Heater, HeaterMode } from '@/types'
import { DialSlider } from './DialSlider'
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
  onSetSetpoint: (id: string, celsius: number) => void
  onSetPowerLevel: (id: string, level: number) => void
  /**
   * Dev only (the local heater): every operating mode can be picked, because the page then owns
   * the mode. Absent on a real heater, where only Power and Temperature are commandable.
   */
  localModes?: {
    mode: OperatingMode
    onChange: (mode: OperatingMode, sensor: HeaterSensor) => void
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

function fmt(value: number | undefined, digits: number, unit: string): string {
  return value === undefined ? '—' : `${value.toFixed(digits)} ${unit}`
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="truncate font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

interface CardProps extends Omit<HeaterPageProps, 'heaters' | 'driverOnline' | 'demo'> {
  id: string
  heater: Heater
  frozen: boolean
}

const CARD_CLASS = 'min-h-0 gap-0! overflow-hidden p-0!'
const CONTENT_CLASS = 'min-h-0 flex-1 gap-4 overflow-y-auto px-4 pt-2 pb-3'
/** The dial card is tighter than the status card: the dial gets what the padding gives back. */
const DIAL_CONTENT_CLASS = 'min-h-0 flex-1 gap-2 overflow-y-auto p-3 pt-2'

/**
 * One heater as two cards: the dial that sets what it should do (left) and what it is doing
 * (right). The dial drives the target temperature, or the power level in the fixed-power mode,
 * the only setting that mode reads.
 */
function HeaterCard({
  id,
  heater,
  frozen,
  onSetRunning,
  onSetMode,
  onSetSetpoint,
  onSetPowerLevel,
  localModes,
}: CardProps) {
  const label = heater.name ?? id
  const reporting = !frozen && isReporting(heater)
  const { send, stateOf } = useCommands(heater, frozen || !reporting)
  const [confirmingStart, setConfirmingStart] = useState(false)
  // A mode the heater cannot switch to while it runs: asked about, then reached after a stop.
  const [switchTarget, setSwitchTarget] = useState<OperatingMode | null>(null)
  const afterStop = useRef<OperatingMode | null>(null)

  const commandsOn = heater.commands_enabled === true
  const controls = reporting && commandsOn
  const settingsOk = controls && canChangeSettings(heater)
  const run = stateOf('run')
  const mode = stateOf('mode')
  const current = localModes?.mode ?? operatingMode(heater)
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
    // The hub's `mode` is Power or a sensor, so Temperature resumes the last sensor.
    if (next === 'power') send('mode', () => onSetMode(id, 'power'))
    if (next === 'temperature') send('mode', () => onSetMode(id, sensor))
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

  return (
    <>
      <Card
        aria-label={`${label} setting`}
        className={CARD_CLASS}
        style={{ '--tone': tone, '--tone-fg': toneFg } as CSSProperties}
      >
        {/* No title row: on the 800x480 kiosk the dial is only ever used with the bottom bar up, so
            every pixel goes to it. The heater's name is the status card's title. */}
        <Card.Content className={DIAL_CONTENT_CLASS}>
          <h2 className="sr-only">{label}</h2>
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
          {/* Bottom-anchored, on the same line as the status card's Start/Stop. */}
          <div className="mt-auto flex flex-col gap-1.5">
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
                        {isSelected && (
                          <span className="truncate text-sm font-medium">{modeLabel}</span>
                        )}
                      </>
                    )}
                  </ToggleButton>
                )
              })}
            </ToggleButtonGroup>
          </div>
        </Card.Content>
      </Card>

      <Card aria-label={`${label} status`} className={CARD_CLASS}>
        <Card.Header className="flex-row! items-center justify-between gap-2 px-5 py-3">
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <HeaterIcon aria-hidden="true" className="text-muted size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </h2>
          <span className="text-sm font-semibold">{reporting ? phase : 'Unknown'}</span>
        </Card.Header>
        <Card.Content className={CONTENT_CLASS}>
          {reporting && hasError(heater) && (
            <p
              role="alert"
              className="bg-danger/10 text-danger flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
            >
              <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
              Heater fault, error {heater.error_code}
            </p>
          )}

          <dl aria-label={`${label} readings`} className="grid grid-cols-2 gap-4">
            <Readout
              label="Cabin"
              value={reporting ? fmt(heater.internal_temperature_c, 1, '°C') : '—'}
            />
            <Readout
              label="Heater"
              value={reporting ? fmt(heater.heater_temperature_c, 0, '°C') : '—'}
            />
            {heater.external_temperature_c !== undefined && reporting && (
              <Readout label="External" value={fmt(heater.external_temperature_c, 1, '°C')} />
            )}
            <Readout label="Voltage" value={reporting ? fmt(heater.voltage_v, 1, 'V') : '—'} />
            <Readout label="Fan" value={reporting ? fmt(heater.fan_rpm, 0, 'rpm') : '—'} />
            <Readout
              label="Fuel pump"
              value={reporting ? fmt(heater.fuel_pump_hz, 1, 'Hz') : '—'}
            />
            {heater.runtime_s !== undefined && reporting && (
              <Readout label="Runtime" value={formatRuntime(heater.runtime_s)} />
            )}
            <div className="col-start-2 flex min-w-0 flex-col gap-0.5">
              <dt className="text-muted text-xs">Sensor</dt>
              <dd>
                {/* Which probe a temperature mode reads. Power mode reads none, and the heater
                    does not accept a sensor change while running in it (Comfort Control manual,
                    section 4.3). */}
                <Select
                  aria-label="Temperature sensor"
                  fullWidth
                  isDisabled={!settingsOk || mode !== undefined || sensorLocked(current)}
                  value={sensor}
                  onChange={(key) => {
                    const next = key as HeaterSensor
                    if (next !== sensor) send('mode', () => onSetMode(id, next))
                  }}
                >
                  <Select.Trigger className="min-h-9">
                    <Select.Value />
                    {mode && !mode.failed ? <Spinner size="sm" /> : <Select.Indicator />}
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {HEATER_SENSORS.map((key) => (
                        <ListBox.Item key={key} id={key} textValue={MODE_LABELS[key]}>
                          {MODE_LABELS[key]}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </dd>
            </div>
          </dl>

          {!reporting && !frozen && (
            <p className="text-muted text-xs">No recent reading from the heater.</p>
          )}
          {reporting && !commandsOn && (
            <p className="text-muted text-xs">
              Commands are turned off on the heater driver, so this page is read-only.
            </p>
          )}

          <div className="mt-auto flex flex-col gap-1.5">
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
        </Card.Content>
      </Card>

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
                    <AlertDialog.Heading>Start {label}?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <Button variant="tertiary" onPress={close}>
                      Cancel
                    </Button>
                    <Button
                      onPress={() => {
                        send('run', () => onSetRunning(id, true))
                        close()
                      }}
                    >
                      Start
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
