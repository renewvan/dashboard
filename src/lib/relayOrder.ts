/**
 * The order of relay channels inside a group card is one shared array of relay ids
 * (`renewvan/hub/relay-order`, hub ADR 0028), not one per group: a relay keeps its place when it
 * moves between groups, and the hub never has to know which relays are in which group.
 */

const byNumericId = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

/** `ids` in the order of `order`; ids it does not list follow, sorted by id. Ignores ids not in `ids`. */
export function sortByRelayOrder(ids: readonly string[], order: readonly string[]): string[] {
  const present = new Set(ids)
  const listed = order.filter((id, i) => present.has(id) && order.indexOf(id) === i)
  const listedSet = new Set(listed)
  return [...listed, ...ids.filter((id) => !listedSet.has(id)).sort(byNumericId)]
}

/**
 * The new order array after one card's relay is dragged from `from` to `to`. `cardIds` are the
 * card's relays as shown (already in order) and `allIds` every relay on the bus. The card's relays
 * keep the slots they held in the whole sequence and only trade places among themselves, so no
 * other card moves. The result lists every relay on the bus, so what was unlisted gets a place.
 */
export function reorderedRelayOrder(
  allIds: readonly string[],
  order: readonly string[],
  cardIds: readonly string[],
  from: number,
  to: number,
): string[] {
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < cardIds.length
  const whole = sortByRelayOrder(allIds, order)
  if (!inRange(from) || !inRange(to) || from === to) return whole
  const moved = [...cardIds]
  const [id] = moved.splice(from, 1)
  moved.splice(to, 0, id)
  const inCard = new Set(cardIds)
  let next = 0
  return whole.map((other) => (inCard.has(other) ? moved[next++] : other))
}
