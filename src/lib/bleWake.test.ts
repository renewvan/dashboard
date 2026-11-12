import { describe, expect, it, vi } from 'vite-plus/test'
import {
  MAX_SECRET_LENGTH,
  RESULT_TIMEOUT_MS,
  WAKE_COMMAND,
  WAKE_RESULT,
  WAKE_SERVICE,
  WAKE_STATUS,
  encodeWakeCommand,
  parseWakeResult,
  parseWakeStatus,
  secretProblem,
  wakeHub,
  type BleApi,
} from './bleWake'

const text = (s: string) => new DataView(new TextEncoder().encode(s).buffer)

/**
 * A board that answers status reads from `status` in order (a lone string answers every read, the
 * last of a list repeats); records what was written and how it ended. With `verdict` it has the
 * result characteristic and notifies that verdict on every write (`silent` has the characteristic
 * but never notifies); without, it is a board on older firmware, where looking it up fails.
 */
function fakeBoard(
  status: string | string[],
  { writeError, verdict, silent }: { writeError?: Error; verdict?: string; silent?: boolean } = {},
) {
  const reads = [status].flat()
  const written: Uint8Array[] = []
  const disconnect = vi.fn()
  const result = Object.assign(new EventTarget(), {
    value: undefined as DataView | undefined,
    startNotifications: vi.fn(async () => {}),
    writeValue: vi.fn(),
    readValue: vi.fn(),
  })
  const characteristics: Record<string, unknown> = {
    [WAKE_COMMAND]: {
      writeValueWithResponse: vi.fn(async (value: BufferSource) => {
        if (writeError) throw writeError
        written.push(new Uint8Array(value as ArrayBuffer))
        if (verdict && !silent) {
          result.value = text(verdict)
          result.dispatchEvent(new Event('characteristicvaluechanged'))
        }
      }),
      writeValue: vi.fn(),
      readValue: vi.fn(),
    },
    [WAKE_STATUS]: {
      writeValue: vi.fn(),
      readValue: vi.fn(async () => text(reads.length > 1 ? reads.shift()! : reads[0])),
    },
  }
  if (verdict) characteristics[WAKE_RESULT] = result
  const requestDevice = vi.fn(async () => ({
    gatt: {
      connect: async () => ({
        getPrimaryService: async (uuid: string) => {
          expect(uuid).toBe(WAKE_SERVICE)
          return {
            getCharacteristic: async (c: string) => {
              if (!(c in characteristics)) throw new Error('no such characteristic')
              return characteristics[c]
            },
          }
        },
        disconnect,
      }),
    },
  }))
  return {
    bluetooth: { requestDevice } as unknown as BleApi,
    written,
    disconnect,
    requestDevice,
    result,
  }
}

describe('encodeWakeCommand', () => {
  it('is the secret, a bar and "on", as UTF-8', () => {
    expect(new TextDecoder().decode(encodeWakeCommand('hunter2'))).toBe('hunter2|on')
  })

  it('keeps a bar inside the secret: the board splits at the last one', () => {
    expect(new TextDecoder().decode(encodeWakeCommand('a|b'))).toBe('a|b|on')
  })
})

describe('parseWakeStatus', () => {
  it('reads on and off', () => {
    expect(parseWakeStatus(text('on'))).toBe('on')
    expect(parseWakeStatus(text('off'))).toBe('off')
  })

  it('reads anything else as unknown', () => {
    expect(parseWakeStatus(text('locked'))).toBe('unknown')
    expect(parseWakeStatus(undefined)).toBe('unknown')
  })
})

describe('parseWakeResult', () => {
  it('reads ok, denied and locked, and anything else as no verdict', () => {
    expect(parseWakeResult(text('ok'))).toBe('ok')
    expect(parseWakeResult(text('denied'))).toBe('denied')
    expect(parseWakeResult(text('locked'))).toBe('locked')
    expect(parseWakeResult(text(''))).toBeNull()
    expect(parseWakeResult(undefined)).toBeNull()
  })
})

describe('secretProblem', () => {
  it('rejects an empty secret and one over the limit, accepts the rest', () => {
    expect(secretProblem('')).not.toBeNull()
    expect(secretProblem('x'.repeat(MAX_SECRET_LENGTH + 1))).not.toBeNull()
    expect(secretProblem('x'.repeat(MAX_SECRET_LENGTH))).toBeNull()
  })
})

describe('wakeHub', () => {
  it('asks for a board by the wake service, writes the command and returns the board status', async () => {
    const board = fakeBoard(['off', 'on'])
    await expect(wakeHub('hunter2', board.bluetooth)).resolves.toBe('on')
    expect(board.requestDevice).toHaveBeenCalledWith({ filters: [{ services: [WAKE_SERVICE] }] })
    expect(new TextDecoder().decode(board.written[0])).toBe('hunter2|on')
    expect(board.disconnect).toHaveBeenCalledOnce()
  })

  it('reports off when the board refused the write', async () => {
    const board = fakeBoard('off')
    await expect(wakeHub('wrong', board.bluetooth)).resolves.toBe('off')
  })

  it('does not confirm a wake when the relay was already on: the status cannot show the secret was right', async () => {
    const board = fakeBoard('on')
    await expect(wakeHub('wrong', board.bluetooth)).resolves.toBe('already-on')
  })

  it('never opens the chooser for a bad secret', async () => {
    const board = fakeBoard('on')
    await expect(wakeHub('', board.bluetooth)).rejects.toThrow('Enter the wake secret')
    expect(board.requestDevice).not.toHaveBeenCalled()
  })

  it('fails clearly where there is no Bluetooth', async () => {
    await expect(wakeHub('hunter2', null)).rejects.toThrow('not available')
  })

  it('passes a cancelled chooser through unchanged', async () => {
    const cancelled = Object.assign(new Error('chooser cancelled'), { name: 'NotFoundError' })
    const bluetooth = { requestDevice: vi.fn().mockRejectedValue(cancelled) } as unknown as BleApi
    await expect(wakeHub('hunter2', bluetooth)).rejects.toBe(cancelled)
  })

  it('disconnects even when the write fails', async () => {
    const board = fakeBoard('on', { writeError: new Error('gatt write failed') })
    await expect(wakeHub('hunter2', board.bluetooth)).rejects.toThrow('gatt write failed')
    expect(board.disconnect).toHaveBeenCalledOnce()
  })

  describe('with a board that reports the verdict of a write', () => {
    it('is on when the board accepted the secret, even though the relay was already on', async () => {
      const board = fakeBoard('on', { verdict: 'ok' })
      await expect(wakeHub('hunter2', board.bluetooth)).resolves.toBe('on')
    })

    it('is denied for a wrong secret even though the relay is already on', async () => {
      const board = fakeBoard('on', { verdict: 'denied' })
      await expect(wakeHub('wrong', board.bluetooth)).resolves.toBe('denied')
      expect(board.disconnect).toHaveBeenCalledOnce()
    })

    it('is locked when the board is locked out', async () => {
      const board = fakeBoard('off', { verdict: 'locked' })
      await expect(wakeHub('wrong', board.bluetooth)).resolves.toBe('locked')
    })

    it('falls back to comparing statuses when no verdict arrives in time', async () => {
      vi.useFakeTimers()
      try {
        const board = fakeBoard('on', { verdict: 'ok', silent: true })
        const outcome = wakeHub('hunter2', board.bluetooth)
        await vi.advanceTimersByTimeAsync(RESULT_TIMEOUT_MS)
        await expect(outcome).resolves.toBe('already-on')
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
