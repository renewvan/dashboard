import type { DeviceRow } from './devices'

/**
 * The Device that feeds the van's `router` entity: the one whose retained info says it publishes
 * `router` (today `driver-router`, a Teltonika RUT-360). Found by what it publishes, not by its key,
 * so a renamed Device still counts. Undefined while no such Device has reported, which is how the
 * dashboard knows no router driver is installed: nothing else on the bus names the hardware.
 */
export function routerDevice(devices: readonly DeviceRow[]): DeviceRow | undefined {
  return devices.find((row) => row.info?.publishes?.includes('router'))
}

// A Teltonika-style model: letters, an optional hyphen, then digits (`RUT-360`, `RUTX11`, `RUT956`).
const MODEL = /\b[A-Z]{2,}-?\d{2,}[A-Z0-9]*\b/

/**
 * What the router is called on Settings → Connectivity: its model (`RUT-360`) taken from the
 * Device's `product` (`Teltonika RUT-360 router`), or the whole product when it names no model, so
 * a different router is shown as what it says it is and never as a wrong model. `Router` while the
 * Device has no info (it is online, but a Device without info has no product to read).
 */
export function routerName(device: DeviceRow | undefined): string {
  const product = device?.info?.product
  if (!product) return 'Router'
  return product.match(MODEL)?.[0] ?? product
}
