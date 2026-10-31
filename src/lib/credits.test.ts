import { describe, it, expect } from 'vitest'
import {
  computeCreditBacks,
  applyRedeem,
  round6,
  PROTECTION_LIMIT,
  CREDIT_BACK_RATE,
} from '@/lib/credits'

const t = (buyerAddress: string, amount: number) => ({ buyerAddress, amount })

describe('computeCreditBacks', () => {
  it('credits 50% of spend to a losing wallet', () => {
    const out = computeCreditBacks([t('0xA', 20)], [], new Map())
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ wallet: '0xa', amount: 10, newLossesUsed: 1 })
  })

  it('consumes one slot per lost draw, not per ticket', () => {
    const out = computeCreditBacks(
      [t('0xA', 5), t('0xA', 5), t('0xA', 10)],
      [],
      new Map(),
    )
    expect(out).toHaveLength(1)
    expect(out[0].amount).toBe(10) // 50% of 20
    expect(out[0].newLossesUsed).toBe(1)
  })

  it('gives nothing to a wallet that won in the draw and does not consume a slot', () => {
    const out = computeCreditBacks([t('0xA', 20), t('0xB', 20)], ['0xa'], new Map())
    expect(out.map((c) => c.wallet)).toEqual(['0xb'])
    expect(out[0].newLossesUsed).toBe(1)
  })

  it('issues on the 5th loss but not the 6th', () => {
    const out5 = computeCreditBacks([t('0xA', 10)], [], new Map([['0xa', 4]]))
    expect(out5).toHaveLength(1)
    expect(out5[0].newLossesUsed).toBe(5)

    const out6 = computeCreditBacks([t('0xA', 10)], [], new Map([['0xa', 5]]))
    expect(out6).toHaveLength(0)
  })

  it('treats winner matching case-insensitively', () => {
    const out = computeCreditBacks([t('0xAbC', 10)], ['0xABC'], new Map())
    expect(out).toHaveLength(0)
  })

  it('handles multiple wallets with different usages', () => {
    const out = computeCreditBacks(
      [t('0xA', 10), t('0xB', 30), t('0xC', 10)],
      ['0xb'],
      { '0xa': 2, '0xc': 5 },
    )
    const byWallet = Object.fromEntries(out.map((c) => [c.wallet, c]))
    expect(byWallet['0xa'].amount).toBe(5)
    expect(byWallet['0xa'].newLossesUsed).toBe(3)
    expect(byWallet['0xb']).toBeUndefined() // winner
    expect(byWallet['0xc']).toBeUndefined() // cap reached
  })

  it('exposes sane constants', () => {
    expect(PROTECTION_LIMIT).toBe(5)
    expect(CREDIT_BACK_RATE).toBe(0.5)
  })
})

describe('applyRedeem', () => {
  it('caps credit at the balance', () => {
    expect(applyRedeem(10, 25)).toBe(10)
  })

  it('caps credit at the total', () => {
    expect(applyRedeem(50, 25)).toBe(25)
  })

  it('never goes negative', () => {
    expect(applyRedeem(-5, 25)).toBe(0)
  })
})

describe('round6', () => {
  it('rounds to 6 decimals', () => {
    expect(round6(1.2345678)).toBe(1.234568)
    expect(round6(0.1 + 0.2)).toBe(0.3)
  })
})
