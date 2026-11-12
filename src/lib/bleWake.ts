/**
 * BLE wake: power the hub on from a phone near the van, over Bluetooth, with no WiFi, router or hub.
 *
 * The wire contract is `packages/ble-wake.yaml` in renewvan/driver-esp32: one GATT service with a
 * write-only command characteristic, a read/notify status one (the relay's state) and a read/notify
 * result one (the verdict on the last write). The board only ever turns its
 * wake channel ON over BLE (switching the hub off is a shutdown the hub finishes first), and a
 * write is accepted only with the shared secret.
 *
 * Web Bluetooth is Chrome/Edge on Android and desktop; iOS browsers do not have it.
 */

export const WAKE_SERVICE = '7e1a0001-6f6e-4f3a-9c10-52656e657776'
export const WAKE_COMMAND = '7e1a0002-6f6e-4f3a-9c10-52656e657776'
export const WAKE_STATUS = '7e1a0003-6f6e-4f3a-9c10-52656e657776'
export const WAKE_RESULT = '7e1a0004-6f6e-4f3a-9c10-52656e657776'

/** How long to wait for the board's verdict before falling back to comparing statuses. */
export const RESULT_TIMEOUT_MS = 3000

/** Longest secret the page sends: the firmware's write buffer is bounded, so fail here, early. */
export const MAX_SECRET_LENGTH = 80

export type BoardStatus = 'on' | 'off' | 'unknown'

/**
 * What a wake attempt established. `on`: the board accepted the secret and the hub's relay is on.
 * `denied` / `locked`: the board's verdict was a wrong secret / the command is locked after three
 * wrong ones. The rest is the fallback for a board whose firmware has no result characteristic,
 * which can only compare the relay's state around the write: `already-on` (it was on before, so the
 * status says nothing about the secret), `off` (the write was refused) and `unknown` (unreadable).
 */
export type WakeStatus = 'on' | 'already-on' | 'off' | 'denied' | 'locked' | 'unknown'

/** The slice of the Web Bluetooth API this module uses (the DOM lib has no types for it). */
export interface BleCharacteristic {
  writeValueWithResponse?(value: BufferSource): Promise<void>
  writeValue(value: BufferSource): Promise<void>
  readValue(): Promise<DataView>
  startNotifications?(): Promise<unknown>
  addEventListener?(type: 'characteristicvaluechanged', listener: (event: Event) => void): void
  removeEventListener?(type: 'characteristicvaluechanged', listener: (event: Event) => void): void
}
export interface BleServer {
  getPrimaryService(uuid: string): Promise<{
    getCharacteristic(uuid: string): Promise<BleCharacteristic>
  }>
  disconnect(): void
}
export interface BleDevice {
  gatt?: { connect(): Promise<BleServer> }
}
export interface BleApi {
  requestDevice(options: { filters: { services: string[] }[] }): Promise<BleDevice>
}

/** The command the board expects: `<secret>|on`, UTF-8. */
export function encodeWakeCommand(secret: string): Uint8Array<ArrayBuffer> {
  // `from` copies into a plain ArrayBuffer, which is what the GATT write accepts as a BufferSource.
  return Uint8Array.from(new TextEncoder().encode(`${secret}|on`))
}

/** The board's status text (`on` / `off`), or `unknown` for anything else. */
export function parseWakeStatus(value: DataView | undefined): BoardStatus {
  if (!value) return 'unknown'
  const text = new TextDecoder().decode(value).trim()
  return text === 'on' || text === 'off' ? text : 'unknown'
}

/** The board's verdict on a write (`ok` / `denied` / `locked`), or null for anything else. */
export function parseWakeResult(value: DataView | undefined): 'ok' | 'denied' | 'locked' | null {
  if (!value) return null
  const text = new TextDecoder().decode(value).trim()
  return text === 'ok' || text === 'denied' || text === 'locked' ? text : null
}

/**
 * Subscribes to the result characteristic and returns what to await: the verdict of the next write,
 * or null after `RESULT_TIMEOUT_MS` (or at once when the board's firmware has no such
 * characteristic, or the browser cannot notify). Subscribing must precede the write.
 */
async function expectVerdict(
  result: BleCharacteristic | null,
): Promise<() => Promise<'ok' | 'denied' | 'locked' | null>> {
  const none = async () => null
  if (!result?.startNotifications || !result.addEventListener) return none
  let settle: (verdict: 'ok' | 'denied' | 'locked' | null) => void = () => {}
  const verdict = new Promise<'ok' | 'denied' | 'locked' | null>((resolve) => (settle = resolve))
  const listener = (event: Event) => {
    const value = (event.target as { value?: DataView } | null)?.value
    const parsed = parseWakeResult(value)
    if (parsed) settle(parsed)
  }
  try {
    result.addEventListener('characteristicvaluechanged', listener)
    await result.startNotifications()
  } catch {
    return none
  }
  return async () => {
    const timer = setTimeout(() => settle(null), RESULT_TIMEOUT_MS)
    try {
      return await verdict
    } finally {
      clearTimeout(timer)
      result.removeEventListener?.('characteristicvaluechanged', listener)
    }
  }
}

/** The browser's Web Bluetooth entry point, or null where there is none (iOS, Firefox, insecure origin). */
export function getBluetooth(): BleApi | null {
  if (typeof navigator === 'undefined') return null
  const bluetooth = (navigator as Navigator & { bluetooth?: BleApi }).bluetooth
  return bluetooth ?? null
}

/** Why the secret cannot be sent, or null when it can. */
export function secretProblem(secret: string): string | null {
  if (secret.length === 0) return 'Enter the wake secret first.'
  if (new TextEncoder().encode(secret).length > MAX_SECRET_LENGTH) return 'The secret is too long.'
  return null
}

/**
 * Connects to a board, sends the wake command and says what it established (see `WakeStatus`). The
 * board answers a write with a verdict on its result characteristic: `ok` is `on`, a refusal is
 * `denied` (three wrong secrets in a row lock the command for 60 seconds, then `locked`). Older
 * firmware has no verdict, and its status is only the relay's state, so the status is read before
 * and after and a relay already on is reported as `already-on`, never as a confirmed wake. The
 * chooser is the browser's own, so the user taps the board once; a cancelled chooser rejects with a
 * `NotFoundError`.
 */
export async function wakeHub(
  secret: string,
  bluetooth: BleApi | null = getBluetooth(),
): Promise<WakeStatus> {
  const problem = secretProblem(secret)
  if (problem) throw new Error(problem)
  if (!bluetooth) throw new Error('Bluetooth is not available in this browser.')

  const device = await bluetooth.requestDevice({ filters: [{ services: [WAKE_SERVICE] }] })
  if (!device.gatt) throw new Error('This device has no Bluetooth GATT server.')
  const server = await device.gatt.connect()
  try {
    const service = await server.getPrimaryService(WAKE_SERVICE)
    const command = await service.getCharacteristic(WAKE_COMMAND)
    const status = await service.getCharacteristic(WAKE_STATUS)
    // A board without the result characteristic rejects this lookup: fall back to the statuses.
    const result = await service.getCharacteristic(WAKE_RESULT).catch(() => null)
    const verdictOfWrite = await expectVerdict(result)
    const before = parseWakeStatus(await status.readValue())
    const payload = encodeWakeCommand(secret)
    if (command.writeValueWithResponse) await command.writeValueWithResponse(payload)
    else await command.writeValue(payload)
    const verdict = await verdictOfWrite()
    if (verdict) return verdict === 'ok' ? 'on' : verdict
    const after = parseWakeStatus(await status.readValue())
    return after === 'on' && before === 'on' ? 'already-on' : after
  } finally {
    server.disconnect()
  }
}
