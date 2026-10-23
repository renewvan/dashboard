import { useRef, useState } from 'react'
import { Input, Label, TextField } from '@heroui/react'
import { VAN_FIELDS, VAN_LABELS, type Van } from '@/hooks/useVan'

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
 * Settings › Advanced › Van (`?view=van`): the van's name, brand, model, kilometres and plate.
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
    </div>
  )
}
