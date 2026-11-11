/**
 * BLE wake: power the hub on from a phone near the van, over Bluetooth, with no WiFi, router or hub.
 *
 * The wire contract is `packages/ble-wake.yaml` in renewvan/driver-esp32: one GATT service with a
 * write-only command characteristic and a read/notify status one. The board only ever turns its
 * wake channel ON over BLE (switching the hub off is a shutdown the hub finishes first), and a
 * write is accepted only with the shared secret.
 *
 * Web Bluetooth is Chrome/Edge on Android and desktop; iOS browsers do not have it.
 */

export const WAKE_SERVICE = '7e1a0001-6f6e-4f3a-9c10-52656e657776'
export const WAKE_COMMAND = '7e1a0002-6f6e-4f3a-9c10-52656e657776'
export const WAKE_STATUS = '7e1a0003-6f6e-4f3a-9c10-52656e657776'

/** Longest secret the page sends: the firmware's write buffer is bounded, so fail here, early. */
export const MAX_SECRET_LENGTH = 80

export type WakeStatus = 'on' | 'off' | 'unknown'

/** The slice of the Web Bluetooth API this module uses (the DOM lib has no types for it). */
export interface BleCharacteristic {
  writeValueWithResponse?(value: BufferSource): Promise<void>
  writeValue(value: BufferSource): Promise<void>
  readValue(): Promise<DataView>
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
export function parseWakeStatus(value: DataView | undefined): WakeStatus {
  if (!value) return 'unknown'
  const text = new TextDecoder().decode(value).trim()
  return text === 'on' || text === 'off' ? text : 'unknown'
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
 * Connects to a board, sends the wake command and returns the board's status afterwards. `on`
 * means the hub's power relay is closed. `off` after a write means the board refused it: a wrong
 * secret (three in a row lock the command for 60 seconds) or a stale pairing. The chooser is the
 * browser's own, so the user taps the board once; a cancelled chooser rejects with a
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
    const payload = encodeWakeCommand(secret)
    if (command.writeValueWithResponse) await command.writeValueWithResponse(payload)
    else await command.writeValue(payload)
    return parseWakeStatus(await status.readValue())
  } finally {
    server.disconnect()
  }
}
