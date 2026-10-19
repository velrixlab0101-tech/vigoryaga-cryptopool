import { describe, it, expect } from 'vitest'
import { toUsdcUnits, fromUsdcUnits, USDC_DECIMALS } from '@/lib/contracts'
import { computePrizePool, computePrizes, clampOperatorFee, totalTierPercent } from '@/lib/prizes'
import { normalizeWallet, isAdminAddress } from '@/lib/admin-wallet'

describe('USDC units', () => {
  it('uses 6 decimals', () => {
    expect(USDC_DECIMALS).toBe(6)
  })

  it('converts dollars to base units', () => {
    expect(toUsdcUnits(1)).toBe(BigInt(1_000_000))
    expect(toUsdcUnits(0.5)).toBe(BigInt(500_000))
    expect(toUsdcUnits(12.34)).toBe(BigInt(12_340_000))
  })

  it('round-trips whole and fractional amounts', () => {
    for (const v of [1, 0.25, 12.5, 999.999999]) {
      expect(fromUsdcUnits(toUsdcUnits(v))).toBeCloseTo(v, 6)
    }
  })
})

describe('prizes', () => {
  it('clamps the operator fee to 0-50', () => {
    expect(clampOperatorFee(-5)).toBe(0)
    expect(clampOperatorFee(10)).toBe(10)
    expect(clampOperatorFee(80)).toBe(50)
    expect(clampOperatorFee(NaN)).toBe(0)
  })

  it('computes the prize pool after the fee', () => {
    expect(computePrizePool(100, 10)).toBe(90)
    expect(computePrizePool(100, 0)).toBe(100)
    expect(computePrizePool(100, 50)).toBe(50)
  })

  it('splits by percentages', () => {
    const tiers = [
      { tier: 1, pct: 50 },
      { tier: 2, pct: 25 },
      { tier: 3, pct: 15 },
      { tier: 4, pct: 7 },
      { tier: 5, pct: 3 },
    ]
    const result = computePrizes(1000, 10, tiers, false)
    expect(result.map((r) => r.place)).toEqual([1, 2, 3, 4, 5])
    expect(result[0].amount).toBe(450)
    expect(result[1].amount).toBe(225)
    expect(result.reduce((s, r) => s + r.amount, 0)).toBeCloseTo(900, 2)
  })

  it('uses fixed amounts when requested', () => {
    const tiers = [
      { tier: 1, amount: 100 },
      { tier: 2, amount: 50 },
    ]
    const result = computePrizes(1000, 10, tiers, true)
    expect(result[0].amount).toBe(100)
    expect(result[1].amount).toBe(50)
  })

  it('totals tier percentages', () => {
    expect(totalTierPercent([{ tier: 1, pct: 60 }, { tier: 2, pct: 40 }])).toBe(100)
  })
})

describe('admin wallet', () => {
  it('normalizes wallet casing', () => {
    expect(normalizeWallet('  0xAbC  ')).toBe('0xabc')
    expect(normalizeWallet(undefined)).toBe('')
  })

  it('never authorizes when no admin wallet is configured', () => {
    const prev = process.env.NEXT_PUBLIC_ADMIN_WALLET
    delete process.env.NEXT_PUBLIC_ADMIN_WALLET
    delete process.env.ADMIN_WALLET
    expect(isAdminAddress('0xabc')).toBe(false)
    if (prev !== undefined) process.env.NEXT_PUBLIC_ADMIN_WALLET = prev
  })
})
