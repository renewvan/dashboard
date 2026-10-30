import { ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { entityIconOf } from '@/lib/entityIcons'

/**
 * The icon row of an entity's Details: one icon-only button per name, the picked one pressed. The
 * name is the lucide component name the entity publishes; a re-tap of the picked icon sends nothing.
 */
export function IconPicker({
  names,
  value,
  onChange,
  isDisabled = false,
}: {
  names: readonly string[]
  /** The icon the entity publishes; none (or an unknown one) leaves every button unpressed. */
  value: string | undefined
  onChange: (name: string) => void
  isDisabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted pt-2 text-xs">Icon</span>
      <ToggleButtonGroup
        aria-label="Icon"
        selectionMode="single"
        disallowEmptySelection
        isDisabled={isDisabled}
        selectedKeys={new Set(value !== undefined && names.includes(value) ? [value] : [])}
        onSelectionChange={(keys) => {
          const key = [...keys][0]
          if (key === undefined) return
          const next = String(key)
          // HeroUI re-fires the selection on a re-tap of the selected item.
          if (names.includes(next) && next !== value) onChange(next)
        }}
        className="flex-wrap justify-end"
      >
        {names.map((name) => {
          const Icon = entityIconOf(name)
          return (
            <ToggleButton key={name} id={name} isIconOnly aria-label={name}>
              <Icon aria-hidden="true" className="size-4" />
            </ToggleButton>
          )
        })}
      </ToggleButtonGroup>
    </div>
  )
}
