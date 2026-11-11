import { describe, expect, it, vi } from 'vite-plus/test'
import {
  MAX_SECRET_LENGTH,
  WAKE_COMMAND,
  WAKE_SERVICE,
  WAKE_STATUS,
  encodeWakeCommand,
  parseWakeStatus,
  secretProblem,
  wakeHub,
  type BleApi,
} from './bleWake'

const text = (s: string) => new DataView(new TextEncoder().encode(s).buffer)

/** A board that answers every status read with `status`; records what was written and how it ended. */
function fakeBoard(status: string, writeError?: Error) {
  const written: Uint8Array[] = []
  const disconnect = vi.fn()
  const characteristics = {
    [WAKE_COMMAND]: {
      writeValueWithResponse: vi.fn(async (value: BufferSource) => {
        if (writeError) throw writeError
        written.push(new Uint8Array(value as ArrayBuffer))
      }),
      writeValue: vi.fn(),
      readValue: vi.fn(),
    },
    [WAKE_STATUS]: {
      writeValue: vi.fn(),
      readValue: vi.fn(async () => text(status)),
    },
  }
  const requestDevice = vi.fn(async () => ({
    gatt: {
      connect: async () => ({
        getPrimaryService: async (uuid: string) => {
          expect(uuid).toBe(WAKE_SERVICE)
          return {
            getCharacteristic: async (c: string) =>
              characteristics[c as keyof typeof characteristics],
          }
        },
        disconnect,
      }),
    },
  }))
  return { bluetooth: { requestDevice } as unknown as BleApi, written, disconnect, requestDevice }
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

describe('secretProblem', () => {
  it('rejects an empty secret and one over the limit, accepts the rest', () => {
    expect(secretProblem('')).not.toBeNull()
    expect(secretProblem('x'.repeat(MAX_SECRET_LENGTH + 1))).not.toBeNull()
    expect(secretProblem('x'.repeat(MAX_SECRET_LENGTH))).toBeNull()
  })
})

describe('wakeHub', () => {
  it('asks for a board by the wake service, writes the command and returns the board status', async () => {
    const board = fakeBoard('on')
    await expect(wakeHub('hunter2', board.bluetooth)).resolves.toBe('on')
    expect(board.requestDevice).toHaveBeenCalledWith({ filters: [{ services: [WAKE_SERVICE] }] })
    expect(new TextDecoder().decode(board.written[0])).toBe('hunter2|on')
    expect(board.disconnect).toHaveBeenCalledOnce()
  })

  it('reports off when the board refused the write', async () => {
    const board = fakeBoard('off')
    await expect(wakeHub('wrong', board.bluetooth)).resolves.toBe('off')
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
    const board = fakeBoard('on', new Error('gatt write failed'))
    await expect(wakeHub('hunter2', board.bluetooth)).rejects.toThrow('gatt write failed')
    expect(board.disconnect).toHaveBeenCalledOnce()
  })
})
