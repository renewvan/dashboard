import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/** `localStorage.getItem` that reads as `null` where storage is missing, blocked or throws. */
export function readStorage(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** `localStorage.setItem` that gives up silently (private mode, quota, blocked): the choice then lasts until reload. */
export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Nothing to do: the in-memory state is still right, it is only not persisted.
  }
}

/**
 * State kept in `localStorage` under `key`. `parse` turns what is stored (`null` when nothing is,
 * or when storage cannot be read) into a value and must fall back to the default for anything it
 * does not recognise; `serialize` turns the value back into the string to store. Both should be
 * module-level functions. Storage failures never throw: the state just is not persisted.
 */
export function useStoredState<T>(
  key: string,
  parse: (raw: string | null) => T,
  serialize: (value: T) => string = String,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => parse(readStorage(key)))

  useEffect(() => {
    writeStorage(key, serialize(value))
  }, [key, serialize, value])

  return [value, setValue]
}
