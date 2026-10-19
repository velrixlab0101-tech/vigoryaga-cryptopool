/**
 * Converts Prisma `Decimal` instances (and BigInt) into JSON-friendly numbers
 * so API responses stay stable for the frontend, which treats money as
 * numbers. The database still stores exact `numeric(20,6)` values.
 */
export function serialize<T>(value: T): T {
  return convert(value) as T
}

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { toNumber?: unknown; toFixed?: unknown; d?: unknown; e?: unknown; s?: unknown }
  return (
    typeof candidate.toNumber === 'function' &&
    typeof candidate.toFixed === 'function' &&
    'd' in candidate &&
    'e' in candidate &&
    's' in candidate
  )
}

function convert(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (isDecimalLike(value)) return value.toNumber()
  if (typeof value === 'bigint') return Number(value)
  if (Array.isArray(value)) return value.map(convert)
  if (value instanceof Date) return value
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = convert(v)
    }
    return out
  }
  return value
}
