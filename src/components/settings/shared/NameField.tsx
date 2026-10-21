import { useRef, useState } from 'react'
import { Input, Label, TextField } from '@heroui/react'
import { byteLength } from '@/lib/text'

interface NameFieldProps {
  /** The value the bus holds; shown whenever the field is not being edited. */
  name: string | undefined
  onCommit: (name: string) => void
  /** Greys the field out, for a sensor whose identity has not arrived yet. */
  isDisabled?: boolean
  /**
   * The device's limit in UTF-8 bytes. The counter shows it, and a longer name is never committed:
   * the device would silently drop it, and the field would only show the old name again.
   */
  maxBytes?: number
}

/**
 * Name field that commits on Enter or on leaving the field instead of per
 * keystroke: every commit becomes a retained identity topic and a state-file
 * write on the Pi, so typing "Galley fridge" must not publish eleven partial
 * names. While not editing it shows the bus value directly (another client's
 * edit, or the device rejecting ours, shows through); the typed draft only
 * exists mid-edit. Nothing is applied optimistically.
 */
export function NameField({ name, onCommit, isDisabled = false, maxBytes }: NameFieldProps) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const cancelled = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEditing = () => {
    setDraft(name ?? '')
    setEditing(true)
  }

  // The one commit path: Enter and Escape both blur the input, so this runs on every way out.
  const commit = () => {
    setEditing(false)
    // Escape's blur() runs this synchronously, before any state it set has
    // re-rendered -- without the flag a cancelled edit would be published.
    const wasCancelled = cancelled.current
    cancelled.current = false
    const next = draft.trim()
    if (wasCancelled || next === '' || next === name) return
    if (maxBytes !== undefined && byteLength(next) > maxBytes) return
    onCommit(next)
  }

  const shown = editing ? draft : (name ?? '')
  const over = maxBytes !== undefined && byteLength(shown.trim()) > maxBytes

  return (
    <TextField
      value={shown}
      isDisabled={isDisabled}
      isInvalid={over}
      onChange={setDraft}
      onFocus={startEditing}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') inputRef.current?.blur()
        if (event.key === 'Escape') {
          cancelled.current = true
          inputRef.current?.blur()
        }
      }}
    >
      <Label>Name</Label>
      <Input ref={inputRef} variant="secondary" fullWidth />
      {maxBytes !== undefined && (
        <span className={`text-xs tabular-nums ${over ? 'text-danger' : 'text-muted'}`}>
          {byteLength(shown.trim())} / {maxBytes} bytes
        </span>
      )}
    </TextField>
  )
}
