import { Button, ComboBox, Input, ListBox } from '@heroui/react'
import { Minus, Plus } from 'lucide-react'
import { TIMER_PRESETS } from '@/lib/heater'
import type { HeaterTimer, HeaterTimerKind } from '@/lib/heater'
import { Countdown } from './TimerSelect'

const KINDS: readonly { value: HeaterTimerKind; label: string }[] = [
  { value: 'on', label: 'On in' },
  { value: 'off', label: 'Off in' },
]
const HOURS: readonly number[] = Array.from({ length: 24 }, (_, i) => i)
const MINUTES: readonly number[] = Array.from({ length: 60 }, (_, i) => i)

/** Minutes as `HH:MM`: 0 is `00:00`, 90 is `01:30`. */
export function formatHoursMinutes(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

/**
 * The card subtitle: the armed time as `HH:MM`, or the time left while a countdown runs (the stop
 * for Off in, the start for On in).
 */
export function TimerTime({ timer }: { timer: HeaterTimer | undefined }) {
  if (timer?.endsAt !== undefined) return <Countdown endsAt={timer.endsAt} />
  return <>{formatHoursMinutes(timer?.minutes ?? 0)}</>
}

/** One press of − or + moves the timer by this many minutes (the first preset, 30). */
const STEP = TIMER_PRESETS[0]
const LONGEST = 23 * 60 + 59

/**
 * The card header: a big minus on the left and a big plus on the right, each as tall as both rows,
 * with the title over the time between them. The buttons take 30 minutes off or add 30 minutes to
 * the armed time (0 to 23:59); the time is the armed time, or the time left while a countdown
 * runs. Disabled without a `timer` (a real heater).
 */
export function TimerHeader({
  timer,
  disabled,
}: {
  timer: HeaterTimer | undefined
  disabled: boolean
}) {
  const off = disabled || timer === undefined
  const minutes = timer?.minutes ?? 0
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Button
        isIconOnly
        variant="outline"
        className="size-12 min-h-12 min-w-12 rounded-full"
        aria-label="Subtract 30 minutes"
        isDisabled={off || minutes <= 0}
        onPress={() => timer?.onChange(Math.max(0, minutes - STEP))}
      >
        <Minus aria-hidden="true" className="size-7" />
      </Button>
      <div className="flex flex-col items-center">
        <h2 className="text-sm font-semibold">Timer</h2>
        <p className="text-muted text-xs tabular-nums">
          <TimerTime timer={timer} />
        </p>
      </div>
      <Button
        isIconOnly
        variant="outline"
        className="size-12 min-h-12 min-w-12 rounded-full"
        aria-label="Add 30 minutes"
        isDisabled={off || minutes >= LONGEST}
        onPress={() => timer?.onChange(Math.min(LONGEST, minutes + STEP))}
      >
        <Plus aria-hidden="true" className="size-7" />
      </Button>
    </div>
  )
}

/**
 * One field of the timer: shows the chosen option, opens a list on a tap, and filters it as you
 * type (so "45" finds 45 Min.). Keys are strings; the caller maps them back.
 */
function Field({
  label,
  options,
  value,
  onSelect,
  disabled,
  className,
}: {
  label: string
  options: readonly { key: string; label: string }[]
  value: string
  onSelect: (key: string) => void
  disabled: boolean
  className?: string
}) {
  return (
    <ComboBox
      aria-label={label}
      className={className}
      isDisabled={disabled}
      menuTrigger="focus"
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key !== null) onSelect(String(key))
      }}
    >
      <ComboBox.InputGroup className="h-11 w-full">
        <Input
          aria-label={label}
          // Pick-only: no typing (and no on-screen keyboard on a touch screen).
          readOnly
          inputMode="none"
          // No focus ring (it was clipped by the scroll area and loud): a lighter fill says "focused".
          className="bg-default/60 focus:bg-default/90! h-11 w-full min-w-0 cursor-pointer touch-manipulation rounded-xl text-center caret-transparent select-none [-webkit-tap-highlight-color:transparent] focus:border-transparent! focus:[box-shadow:none]!"
        />
        <ComboBox.Trigger className="touch-manipulation [-webkit-tap-highlight-color:transparent]" />
      </ComboBox.InputGroup>
      {/* No fade/zoom in or out: the list is there the moment you tap (the animation made it feel slow). */}
      <ComboBox.Popover className="data-[entering=true]:animate-none data-[entering=true]:transition-none data-[exiting=true]:animate-none data-[exiting=true]:transition-none">
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.key}
              id={option.key}
              textValue={option.label}
              className="data-[focus-visible=true]:[box-shadow:none]!"
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  )
}

const KIND_OPTIONS = KINDS.map((k) => ({ key: k.value, label: k.label }))
const HOUR_OPTIONS = HOURS.map((h) => ({ key: String(h), label: `${h} Hours` }))
const MINUTE_OPTIONS = MINUTES.map((m) => ({ key: String(m), label: `${m} Min.` }))

/**
 * The timer as one row of three combo boxes: On in / Off in, then Hours, then Minutes. On in
 * starts the heater after the time, Off in stops it; Start connects to the Off in time. Without a
 * `timer` (a real heater: the hub has no timer field yet) it reads 0 and is disabled.
 */
export function TimerPicker({
  timer,
  disabled,
}: {
  timer: HeaterTimer | undefined
  disabled: boolean
}) {
  const off = disabled || timer === undefined
  const minutes = timer?.minutes ?? 0
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return (
    <div
      role="group"
      aria-label="Timer"
      className="mb-1 grid shrink-0 grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-2"
    >
      <Field
        label="Timer type"
        options={KIND_OPTIONS}
        value={timer?.kind ?? 'off'}
        onSelect={(kind) => timer?.onKindChange(kind as HeaterTimerKind)}
        disabled={off}
        className="min-w-0"
      />
      <Field
        label="Hours"
        options={HOUR_OPTIONS}
        value={String(hours)}
        onSelect={(h) => timer?.onChange(Number(h) * 60 + mins)}
        disabled={off}
      />
      <Field
        label="Minutes"
        options={MINUTE_OPTIONS}
        value={String(mins)}
        onSelect={(m) => timer?.onChange(hours * 60 + Number(m))}
        disabled={off}
      />
    </div>
  )
}
