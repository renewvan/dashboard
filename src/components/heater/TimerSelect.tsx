import { useEffect, useState } from 'react'
import { ListBox, Select } from '@heroui/react'
import { formatClock, TIMER_PRESETS, timerLabel } from '@/lib/heater'

const TICK_MS = 250
const OPTIONS: readonly number[] = [0, ...TIMER_PRESETS]

/** Time left, ticking while a countdown runs. */
function Countdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(handle)
  }, [])
  return <span className="tabular-nums">{formatClock(Math.max(0, endsAt - now) / 1000)}</span>
}

/**
 * The timer dropdown, as on Venus OS: Off or one of three preset durations. It shows the armed
 * duration, and the time left while the heater runs the countdown. Disabled without a `timer`
 * (a real heater: the hub has no timer field yet).
 */
export function TimerSelect({
  timer,
  disabled,
  running,
}: {
  timer:
    | { minutes: number; endsAt: number | undefined; onChange: (minutes: number) => void }
    | undefined
  disabled: boolean
  running: boolean
}) {
  const minutes = timer?.minutes ?? 0
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted text-xs">Timer</dt>
      <dd>
        <Select
          aria-label="Timer"
          fullWidth
          isDisabled={disabled || timer === undefined}
          value={String(minutes)}
          onChange={(key) => timer?.onChange(Number(key))}
        >
          <Select.Trigger className="min-h-9">
            {running && timer?.endsAt !== undefined ? (
              <Countdown endsAt={timer.endsAt} />
            ) : (
              <Select.Value />
            )}
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {OPTIONS.map((m) => (
                <ListBox.Item key={m} id={String(m)} textValue={timerLabel(m)}>
                  {timerLabel(m)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </dd>
    </div>
  )
}
