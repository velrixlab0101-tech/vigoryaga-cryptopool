import { describe, it, expect } from 'vitest'
import { serialize } from '@/lib/serialize'

class DecimalLike {
  constructor(public readonly value: number) {}
  d = [this.value]
  e = 0
  s = 1
  toNumber() {
    return this.value
  }
  toFixed(dp: number) {
    return this.value.toFixed(dp)
  }
  toJSON() {
    return { s: this.s, e: this.e, d: this.d }
  }
}

describe('serialize', () => {
  it('converts Decimal-like values to numbers', () => {
    expect(serialize(new DecimalLike(12.5))).toBe(12.5)
  })

  it('converts nested objects and arrays', () => {
    const input = {
      pot: new DecimalLike(100),
      winners: [new DecimalLike(50), new DecimalLike(25.25)],
      nested: { fee: new DecimalLike(10) },
      name: 'draw',
    }
    const out = serialize(input)
    expect(out).toEqual({
      pot: 100,
      winners: [50, 25.25],
      nested: { fee: 10 },
      name: 'draw',
    })
    expect(typeof out.pot).toBe('number')
  })

  it('converts bigint to number', () => {
    expect(serialize({ v: BigInt(42) })).toEqual({ v: 42 })
  })

  it('passes through null, undefined and dates', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    const out = serialize({ a: null, b: undefined, c: date })
    expect(out.a).toBeNull()
    expect(out.b).toBeUndefined()
    expect(out.c).toBe(date)
  })
})
