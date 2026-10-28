import { useRef, useState } from 'react'
import { Input, Label, TextField } from '@heroui/react'
import { VAN_COLOR_PRESETS, VAN_FIELDS, VAN_LABELS, type Van } from '@/hooks/useVan'

interface VanViewProps {
  van: Van
  onChange: (field: keyof Van, value: string) => void
}

/**
 * One text field that commits on Enter or on leaving it, not per keystroke, and drops the draft on
 * Escape. While not editing it shows the stored value, so the typed draft only exists mid-edit.
 */
function VanField({
  label,
  value,
  onCommit,
}: {
  label: string
  value: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const cancelled = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // The one commit path: Enter and Escape both blur the input, so this runs on every way out.
  const commit = () => {
    setEditing(false)
    // Escape's blur() runs this synchronously, before the state it set has re-rendered: without
    // the flag a cancelled edit would be saved.
    const wasCancelled = cancelled.current
    cancelled.current = false
    const next = draft.trim()
    if (wasCancelled || next === value) return
    onCommit(next)
  }

  return (
    <TextField
      value={editing ? draft : value}
      onChange={setDraft}
      onFocus={() => {
        setDraft(value)
        setEditing(true)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') inputRef.current?.blur()
        if (event.key === 'Escape') {
          cancelled.current = true
          inputRef.current?.blur()
        }
      }}
    >
      <Label>{label}</Label>
      <Input ref={inputRef} variant="secondary" fullWidth className="min-h-11" />
    </TextField>
  )
}

/**
 * The van's colour on the map: big swatches (the first is the default blue) and the system picker
 * for any other. An empty value is the default.
 */
function VanColor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const isPreset = VAN_COLOR_PRESETS.some((color) => color === value)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        Colour{' '}
        <span className="text-muted font-normal">· {value === '' ? 'Default blue' : value}</span>
      </span>
      <div role="radiogroup" aria-label="Colour on the map" className="flex flex-wrap gap-3">
        <button
          type="button"
          role="radio"
          aria-checked={value === ''}
          aria-label="Default blue"
          onClick={() => onChange('')}
          className={swatchClass(value === '')}
          style={{ background: 'var(--accent)' }}
        >
          {value === '' && <Check fill="" />}
        </button>
        {VAN_COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={value === color}
            aria-label={color}
            onClick={() => onChange(color)}
            className={swatchClass(value === color)}
            style={{ background: color }}
          >
            {value === color && <Check fill={color} />}
          </button>
        ))}
        <label
          className={`${swatchClass(value !== '' && !isPreset)} relative overflow-hidden`}
          style={{ background: value !== '' && !isPreset ? value : undefined }}
        >
          <span className="sr-only">Custom colour</span>
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-lg">
            {value !== '' && !isPreset ? <Check fill={value} /> : '+'}
          </span>
          <input
            type="color"
            value={value || '#2563eb'}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  )
}

function swatchClass(selected: boolean): string {
  // Selected: a thick ring set off from the fill by a gap, and a larger swatch, so it reads at a glance.
  return `relative grid size-12 shrink-0 place-items-center rounded-full border-2 transition-transform ${
    selected
      ? 'border-border scale-110 shadow-md outline-3 outline-offset-2 outline-foreground'
      : 'border-border'
  }`
}

/** A check in black or white, whichever reads on the swatch's fill (`#rrggbb`, or the accent). */
function checkColor(fill: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(fill)) return '#fff'
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(fill.slice(i, i + 2), 16))
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#0f172a' : '#fff'
}

function Check({ fill }: { fill: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6"
      style={{ color: checkColor(fill) }}
    >
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Settings › Advanced › Van (`?view=van`): the van's name, brand, model, kilometres and plate, and
 * the colour the van is drawn in on the map.
 * Kiosk-local: typed here and kept in this browser, with no bus topic behind it yet.
 */
export function VanView({ van, onChange }: VanViewProps) {
  return (
    <div className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-3.5">
      {VAN_FIELDS.map((field) => (
        <VanField
          key={field}
          label={VAN_LABELS[field]}
          value={van[field]}
          onCommit={(value) => onChange(field, value)}
        />
      ))}
      <VanColor value={van.color} onChange={(value) => onChange('color', value)} />
    </div>
  )
}
