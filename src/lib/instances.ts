import type { DriverRow } from '@/lib/drivers'

/** The identity fields every entity instance may carry (`name`, `driver`). */
interface Instance {
  name?: string
  driver?: string
}

/**
 * The owning Driver's name for an instance, resolved by the instance's own `driver` key: the Driver's
 * row on the bus, else the raw key (a Driver that is not on the bus), else `undefined` for a legacy
 * instance that names none.
 */
export function ownerName(
  instance: Instance,
  drivers: Pick<DriverRow, 'key' | 'name'>[],
): string | undefined {
  if (instance.driver === undefined) return undefined
  return drivers.find((row) => row.key === instance.driver)?.name ?? instance.driver
}

/**
 * The label of one instance: its own `name`, else `<owning Driver's name> · <id>`, else the id. The
 * one wording the instances view, its selector and the Power page share.
 */
export function instanceLabel(
  id: string,
  instance: Instance,
  drivers: Pick<DriverRow, 'key' | 'name'>[],
): string {
  if (instance.name !== undefined && instance.name !== '') return instance.name
  const owner = ownerName(instance, drivers)
  return owner === undefined ? id : `${owner} · ${id}`
}

/** The entity types the instances views list and open. */
export type InstanceType = 'battery' | 'solar' | 'charger' | 'gps' | 'temperature' | 'relay'

const INSTANCE_TYPES: readonly InstanceType[] = [
  'battery',
  'solar',
  'charger',
  'gps',
  'temperature',
  'relay',
]

/**
 * One instance as a single URL value (`?instance=solar:roof`): ids are only unique within a type, so
 * the key carries the type. The id may itself contain a colon, so only the first one separates.
 */
export function instanceKey(type: InstanceType, id: string): string {
  return `${type}:${id}`
}

/** The type and id a key names, `undefined` for anything `instanceKey` did not make. */
export function parseInstanceKey(key: string): { type: InstanceType; id: string } | undefined {
  const cut = key.indexOf(':')
  if (cut < 1 || cut === key.length - 1) return undefined
  const type = INSTANCE_TYPES.find((t) => t === key.slice(0, cut))
  return type === undefined ? undefined : { type, id: key.slice(cut + 1) }
}
