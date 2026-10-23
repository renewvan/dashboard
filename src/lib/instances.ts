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
