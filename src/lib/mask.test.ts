import { describe, expect, it } from 'vitest'
import { anonymizeTickets, displayName, maskAddress, ordinal, publicizeWinners, uniqueBuyers } from '@/lib/mask'

const ADDR = '0x1234567890abcdef1234567890abcdef12345678'

describe('maskAddress', () => {
  it('shortens an address to 0x + 4 and last 4', () => {
    const out = maskAddress(ADDR)
    expect(out).toBe('0x1234…5678')
    expect(out.length).toBeLessThan(ADDR.length)
  })

  it('never exposes the middle of the address', () => {
    expect(maskAddress(ADDR)).not.toContain('cdef')
  })

  it('handles empty and short input', () => {
    expect(maskAddress('')).toBe('')
    expect(maskAddress('0x1234')).toBe('0x1234')
  })
})

describe('displayName', () => {
  it('produces a first name plus a last initial', () => {
    const name = displayName(ADDR)
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z]\.$/)
  })

  it('is stable for the same address and caseless', () => {
    expect(displayName(ADDR)).toBe(displayName(ADDR))
    expect(displayName(ADDR)).toBe(displayName(ADDR.toUpperCase().replace('0X', '0x')))
  })

  it('falls back for an empty address', () => {
    expect(displayName('')).toBe('Anonymous')
  })
})

describe('publicizeWinners', () => {
  it('replaces the wallet with a shortened address and adds a name', () => {
    const out = publicizeWinners([{ place: 1, wallet: ADDR, amount: 50 }])!
    expect(out[0].wallet).toBe('0x1234…5678')
    expect(out[0].displayName).toMatch(/^[A-Z][a-z]+ [A-Z]\.$/)
    expect(out[0].amount).toBe(50)
    expect(out[0].place).toBe(1)
  })

  it('never leaks the full address', () => {
    const json = JSON.stringify(publicizeWinners([{ place: 1, wallet: ADDR }]))
    expect(json).not.toContain(ADDR)
    expect(json).not.toContain('cdef')
  })

  it('passes through empty/undefined arrays', () => {
    expect(publicizeWinners([])).toEqual([])
    expect(publicizeWinners(null)).toBeNull()
    expect(publicizeWinners(undefined)).toBeUndefined()
  })
})

describe('anonymizeTickets', () => {
  it('removes buyerAddress but keeps quantities and amounts', () => {
    const out = anonymizeTickets([{ id: 't1', buyerAddress: ADDR, qty: 3, amount: 12 }])!
    expect(out[0]).toEqual({ id: 't1', qty: 3, amount: 12 })
    expect(JSON.stringify(out)).not.toContain('1234567890')
  })
})

describe('uniqueBuyers', () => {
  it('counts distinct buyers case-insensitively', () => {
    expect(
      uniqueBuyers([
        { buyerAddress: ADDR },
        { buyerAddress: ADDR.toUpperCase().replace('0X', '0x') },
        { buyerAddress: '0x0000000000000000000000000000000000000001' },
      ]),
    ).toBe(2)
  })

  it('ignores empty values', () => {
    expect(uniqueBuyers([{ buyerAddress: null }, { buyerAddress: '' }, {}])).toBe(0)
  })
})

describe('ordinal', () => {
  it('returns correct suffixes', () => {
    expect(ordinal(1)).toBe('st')
    expect(ordinal(2)).toBe('nd')
    expect(ordinal(3)).toBe('rd')
    expect(ordinal(4)).toBe('th')
    expect(ordinal(11)).toBe('th')
  })
})
