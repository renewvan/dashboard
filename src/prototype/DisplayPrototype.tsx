/**
 * PROTOTYPE, THROWAWAY. Not production code. Lives on branch
 * `prototype/settings-display` only; never merge to HeroUI/main.
 *
 * Question (wayfinder ticket "Prototype: Display controls (brightness,
 * auto-sleep) on HeroUI"): how should Settings > General > Display look on
 * HeroUI, and should a slider drag publish per move or on release?
 *
 * Three variants of the Display view on the existing `settings` pane,
 * switchable via `?variant=A|B|C`. State is local and stubbed: nothing is
 * published to MQTT. Each "publish" is a line in the log, standing for one
 * QoS 1 message to the Pi.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button, Label, Slider, Switch, ToggleButton, ToggleButtonGroup } from '@heroui/react'

type Variant = 'A' | 'B' | 'C'
const VARIANTS: { key: Variant; name: string }[] = [
  { key: 'A', name: 'Stacked rows' },
  { key: 'B', name: 'Big readout' },
  { key: 'C', name: 'Presets' },
]

const TIMEOUTS = [1, 5, 15, 30] as const
type Timeout = (typeof TIMEOUTS)[number]
const TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const PRESETS = [10, 25, 50, 75, 100]

type Cadence = 'move' | 'release'

interface DisplayState {
  brightness: number | null
  autoSleep: boolean | null
  timeout: Timeout | null
}

interface Controls {
  state: DisplayState
  cadence: Cadence
  /** Local (UI) value change: always applied; maybe publishes. */
  setBrightness: (v: number, phase: 'move' | 'end') => void
  setAutoSleep: (v: boolean) => void
  setTimeoutMin: (v: Timeout) => void
}

function readVariant(): Variant {
  const v = new URLSearchParams(window.location.search).get('variant')
  return v === 'B' || v === 'C' ? v : 'A'
}

function writeVariant(v: Variant) {
  const params = new URLSearchParams(window.location.search)
  params.set('variant', v)
  window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
}

/* ---------- shared bits (kept tiny so variants stay structurally free) ---------- */

const ROW = 'border-border flex w-full items-center justify-between gap-3 border-b px-3.5 py-3'

function BrightnessSlider({ c }: { c: Controls }) {
  const b = c.state.brightness
  return (
    <Slider
      className="w-full"
      aria-label="Brightness"
      value={b ?? 0}
      isDisabled={b === null}
      onChange={(v) => c.setBrightness(v as number, 'move')}
      onChangeEnd={(v) => c.setBrightness(v as number, 'end')}
    >
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  )
}

function TickScale() {
  return (
    <div
      role="group"
      aria-label="Brightness scale from 0 to 100"
      className="text-muted mt-1 flex w-full items-center justify-between gap-1 px-3 text-xs font-medium"
    >
      {TICKS.map((tick, i) => (
        <span key={tick} className="flex w-0 flex-col items-center justify-center gap-1">
          <span className={i % 2 === 0 ? 'bg-muted/70 h-1 w-px' : 'bg-muted/70 h-0.5 w-px'} />
          <span className={i % 2 === 0 ? '' : 'opacity-0'}>{tick}</span>
        </span>
      ))}
    </div>
  )
}

function TimeoutPicker({ c, fullWidth }: { c: Controls; fullWidth?: boolean }) {
  const t = c.state.timeout
  return (
    <ToggleButtonGroup
      aria-label="Sleep after"
      selectionMode="single"
      disallowEmptySelection
      fullWidth={fullWidth}
      isDisabled={t === null}
      selectedKeys={new Set(t === null ? [] : [String(t)])}
      onSelectionChange={(keys) => {
        const k = [...keys][0]
        if (k !== undefined) c.setTimeoutMin(Number(k) as Timeout)
      }}
    >
      {TIMEOUTS.map((m, i) => (
        <ToggleButton key={m} id={String(m)}>
          {i > 0 && <ToggleButtonGroup.Separator />}
          {m}m
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}

function AutoSleepSwitch({ c, label = 'Auto-sleep' }: { c: Controls; label?: string }) {
  const on = c.state.autoSleep
  return (
    <Switch
      className="w-full"
      isSelected={on ?? false}
      isDisabled={on === null}
      onChange={c.setAutoSleep}
    >
      <Switch.Content className="w-full justify-between px-3.5 py-3">
        <Label>{label}</Label>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  )
}

/* ---------- Variant A: stacked whole-row list (the old structure) ---------- */

function VariantA({ c }: { c: Controls }) {
  const b = c.state.brightness
  return (
    <div className="border-border bg-surface w-full max-w-xl overflow-hidden rounded-2xl border">
      <div className="border-border border-b px-3.5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Brightness</span>
          <span className="text-muted text-xs tabular-nums">{b === null ? '—' : `${b}%`}</span>
        </div>
        <div className="mt-3">
          <BrightnessSlider c={c} />
          <TickScale />
        </div>
      </div>
      <div className="border-border border-b">
        <AutoSleepSwitch c={c} />
      </div>
      {c.state.autoSleep && (
        <div className={ROW + ' border-b-0'}>
          <span className="text-muted text-xs">Sleep after</span>
          <TimeoutPicker c={c} />
        </div>
      )}
    </div>
  )
}

/* ---------- Variant B: big readout, step buttons, large timeout buttons ---------- */

function VariantB({ c }: { c: Controls }) {
  const b = c.state.brightness
  const step = (d: number) => {
    if (b === null) return
    const next = Math.max(0, Math.min(100, b + d))
    c.setBrightness(next, 'end')
  }
  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <section className="flex flex-col items-center gap-4" aria-label="Brightness">
        <div className="text-6xl font-semibold tabular-nums" aria-live="polite">
          {b === null ? '—' : `${b}%`}
        </div>
        <div className="flex w-full items-center gap-3">
          <Button
            isIconOnly
            size="lg"
            variant="secondary"
            aria-label="Decrease brightness"
            isDisabled={b === null}
            onPress={() => step(-10)}
          >
            <Minus className="size-5" />
          </Button>
          <BrightnessSlider c={c} />
          <Button
            isIconOnly
            size="lg"
            variant="secondary"
            aria-label="Increase brightness"
            isDisabled={b === null}
            onPress={() => step(10)}
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium">Auto-sleep</span>
          <Switch
            size="lg"
            aria-label="Auto-sleep"
            isSelected={c.state.autoSleep ?? false}
            isDisabled={c.state.autoSleep === null}
            onChange={c.setAutoSleep}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        </div>
        {c.state.autoSleep && (
          <div className="flex flex-col gap-2">
            <span className="text-muted text-sm">Sleep after</span>
            <ToggleButtonGroup
              aria-label="Sleep after"
              size="lg"
              fullWidth
              selectionMode="single"
              disallowEmptySelection
              isDisabled={c.state.timeout === null}
              selectedKeys={new Set(c.state.timeout === null ? [] : [String(c.state.timeout)])}
              onSelectionChange={(keys) => {
                const k = [...keys][0]
                if (k !== undefined) c.setTimeoutMin(Number(k) as Timeout)
              }}
            >
              {TIMEOUTS.map((m, i) => (
                <ToggleButton key={m} id={String(m)}>
                  {i > 0 && <ToggleButtonGroup.Separator />}
                  {m} min
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        )}
      </section>
    </div>
  )
}

/* ---------- Variant C: presets first, slider is a "fine tune" afterthought ---------- */

function VariantC({ c }: { c: Controls }) {
  const b = c.state.brightness
  const presetKey = b !== null && PRESETS.includes(b) ? String(b) : null
  return (
    <div className="flex w-full max-w-xl flex-col gap-5">
      <section className="flex flex-col gap-2" aria-label="Brightness">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Brightness</span>
          <span className="text-muted text-xs tabular-nums">
            {b === null ? '—' : `${b}%`}
            {b !== null && presetKey === null ? ' (custom)' : ''}
          </span>
        </div>
        <ToggleButtonGroup
          aria-label="Brightness preset"
          size="lg"
          fullWidth
          selectionMode="single"
          isDisabled={b === null}
          selectedKeys={new Set(presetKey === null ? [] : [presetKey])}
          onSelectionChange={(keys) => {
            const k = [...keys][0]
            if (k !== undefined) c.setBrightness(Number(k), 'end')
          }}
        >
          {PRESETS.map((p, i) => (
            <ToggleButton key={p} id={String(p)}>
              {i > 0 && <ToggleButtonGroup.Separator />}
              {p}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <details className="mt-1">
          <summary className="text-muted cursor-pointer py-2 text-xs">Fine tune</summary>
          <BrightnessSlider c={c} />
        </details>
      </section>
      <section className="border-border bg-surface overflow-hidden rounded-2xl border">
        <AutoSleepSwitch c={c} label="Sleep the display when idle" />
        {c.state.autoSleep && (
          <div className="border-border flex flex-col gap-2 border-t px-3.5 py-3">
            <span className="text-muted text-xs">After</span>
            <TimeoutPicker c={c} fullWidth />
          </div>
        )}
      </section>
    </div>
  )
}

/* ---------- harness: stub state, publish log, switcher ---------- */

function useStubDisplay() {
  const [state, setState] = useState<DisplayState>({
    brightness: 60,
    autoSleep: true,
    timeout: 5,
  })
  const [cadence, setCadence] = useState<Cadence>('move')
  const [log, setLog] = useState<string[]>([])
  const [unknown, setUnknown] = useState(false)

  const publish = useCallback((line: string) => {
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l].slice(0, 12))
  }, [])

  const shown: DisplayState = unknown ? { brightness: null, autoSleep: null, timeout: null } : state

  const controls: Controls = useMemo(
    () => ({
      state: shown,
      cadence,
      setBrightness: (v, phase) => {
        setState((s) => ({ ...s, brightness: v }))
        // per-move publishes on every onChange; on-release publishes only on
        // onChangeEnd (also fired by every keyboard press and step button).
        if (cadence === 'move' ? phase === 'move' || phase === 'end' : phase === 'end') {
          publish(`brightness/set ${v}   [${phase === 'move' ? 'onChange' : 'onChangeEnd'}]`)
        }
      },
      setAutoSleep: (v) => {
        setState((s) => ({ ...s, autoSleep: v }))
        publish(`auto_sleep_enabled/set ${v}`)
      },
      setTimeoutMin: (v) => {
        setState((s) => ({ ...s, timeout: v }))
        publish(`auto_sleep_timeout_minutes/set ${v}`)
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unknown, state, cadence, publish],
  )

  return { controls, cadence, setCadence, log, setLog, unknown, setUnknown }
}

export function DisplayPrototype() {
  const [variant, setVariant] = useState<Variant>(readVariant)
  const h = useStubDisplay()

  const go = useCallback((v: Variant) => {
    setVariant(v)
    writeVariant(v)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      const i = VARIANTS.findIndex((x) => x.key === variant)
      if (e.key === 'ArrowLeft') go(VARIANTS[(i + VARIANTS.length - 1) % VARIANTS.length].key)
      if (e.key === 'ArrowRight') go(VARIANTS[(i + 1) % VARIANTS.length].key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variant, go])

  const body: ReactNode =
    variant === 'A' ? (
      <VariantA c={h.controls} />
    ) : variant === 'B' ? (
      <VariantB c={h.controls} />
    ) : (
      <VariantC c={h.controls} />
    )
  const current = VARIANTS.find((x) => x.key === variant)!

  return (
    <div
      data-testid="display-prototype"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pb-24"
    >
      <p className="text-muted mb-3 text-xs">
        PROTOTYPE (throwaway): Settings › General › Display. State is stubbed; nothing is
        published.
      </p>
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 justify-center">{body}</div>
        <aside className="border-border bg-surface w-full shrink-0 rounded-2xl border p-3 text-xs md:w-72">
          <div className="mb-2 flex flex-col gap-2">
            <span className="font-medium">Harness</span>
            <label className="flex items-center justify-between gap-2">
              <span>Simulate not-yet-retained (null)</span>
              <input
                type="checkbox"
                checked={h.unknown}
                onChange={(e) => h.setUnknown(e.target.checked)}
              />
            </label>
            <div className="flex items-center justify-between gap-2">
              <span>Brightness publishes on</span>
              <select
                className="bg-field-background rounded px-1 py-0.5"
                value={h.cadence}
                onChange={(e) => h.setCadence(e.target.value as Cadence)}
              >
                <option value="move">every move (old)</option>
                <option value="release">release only</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Publish log ({h.log.length})</span>
            <button type="button" className="underline" onClick={() => h.setLog([])}>
              clear
            </button>
          </div>
          <ol className="text-muted mt-1 flex max-h-48 flex-col gap-0.5 overflow-y-auto font-mono">
            {h.log.length === 0 ? <li>(none yet)</li> : h.log.map((l, i) => <li key={i}>{l}</li>)}
          </ol>
        </aside>
      </div>

      <div
        role="toolbar"
        aria-label="Prototype variant"
        className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-3 py-1.5 text-sm text-white shadow-lg"
      >
        <button
          type="button"
          aria-label="Previous variant"
          className="px-2"
          onClick={() =>
            go(
              VARIANTS[
                (VARIANTS.findIndex((x) => x.key === variant) + VARIANTS.length - 1) %
                  VARIANTS.length
              ].key,
            )
          }
        >
          ←
        </button>
        <span data-testid="variant-label">
          {current.key} ({current.name})
        </span>
        <button
          type="button"
          aria-label="Next variant"
          className="px-2"
          onClick={() =>
            go(VARIANTS[(VARIANTS.findIndex((x) => x.key === variant) + 1) % VARIANTS.length].key)
          }
        >
          →
        </button>
      </div>
    </div>
  )
}
