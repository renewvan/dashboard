const encoder = new TextEncoder()

/** UTF-8 length: what a node's name limit counts, so a non-ASCII name is shorter in characters. */
export function byteLength(text: string): number {
  return encoder.encode(text).length
}
