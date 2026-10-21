import type { ReactNode } from 'react'
import { ToggleButton, ToggleButtonGroup } from '@heroui/react'

/** One bordered, rounded card per control, stacked with a gap (like the group rows). */
export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">{children}</div>
  )
}

/**
 * A labelled single-choice toggle inline in a row: the shape Theme, Navigation position,
 * Navigation style and the Start page's ring unit share. Re-tapping the selected choice sends
 * nothing. `isDisabled` greys the group out for a choice the device cannot honour (a phone has no
 * say in either navigation row).
 */
export function ChoiceRow<T extends string>({
  label,
  choices,
  value,
  onChange,
  isDisabled = false,
  stacked = false,
}: {
  label: string
  choices: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  isDisabled?: boolean
  /** Puts the label above the group, for a row with more choices than fit beside it on a phone. */
  stacked?: boolean
}) {
  return (
    <div
      className={
        stacked
          ? 'flex flex-col gap-2 px-3.5 py-3'
          : 'flex items-center justify-between gap-3 px-3.5 py-3'
      }
    >
      <span className="text-sm font-medium">{label}</span>
      <ToggleButtonGroup
        aria-label={label}
        selectionMode="single"
        disallowEmptySelection
        isDisabled={isDisabled}
        selectedKeys={new Set([value])}
        onSelectionChange={(keys) => {
          const key = [...keys][0]
          // HeroUI re-fires the selection on a re-tap of the selected item.
          const next = choices.find((choice) => choice.value === key)
          if (next !== undefined && next.value !== value) onChange(next.value)
        }}
      >
        {choices.map((choice, index) => (
          <ToggleButton key={choice.value} id={choice.value}>
            {index > 0 && <ToggleButtonGroup.Separator />}
            {choice.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  )
}
