import { describe, it, expect } from 'vitest'
import {
  generateCode,
  generateAccessToken,
  clampSharePct,
  isApprovedCreator,
  resolveSharePct,
  computeCreatorStats,
} from '@/lib/referrals'

describe('code + token generation', () => {
  it('generates codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode()
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
    }
  })

  it('generates 256-bit hex access tokens', () => {
    const token = generateAccessToken()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(generateAccessToken()).not.toBe(token)
  })
})

describe('share percentage', () => {
  it('clamps to 0..50', () => {
    expect(clampSharePct(-5)).toBe(0)
    expect(clampSharePct(10)).toBe(10)
    expect(clampSharePct(80)).toBe(50)
    expect(clampSharePct(NaN)).toBe(0)
  })

  it('resolves the custom rate for approved creators', () => {
    expect(resolveSharePct({ isCreator: true, active: true, sharePct: 12 })).toBe(12)
  })

  it('earns nothing when not approved or inactive', () => {
    expect(resolveSharePct({ isCreator: false, active: true, sharePct: 12 })).toBe(0)
    expect(resolveSharePct({ isCreator: true, active: false, sharePct: 12 })).toBe(0)
    expect(resolveSharePct(null)).toBe(0)
  })

  it('earns nothing without an explicit rate', () => {
    expect(resolveSharePct({ isCreator: true, active: true, sharePct: null })).toBe(0)
  })

  it('isApprovedCreator requires both flags', () => {
    expect(isApprovedCreator({ isCreator: true, active: true, sharePct: 5 })).toBe(true)
    expect(isApprovedCreator({ isCreator: true, active: false, sharePct: 5 })).toBe(false)
    expect(isApprovedCreator({ isCreator: false, active: true, sharePct: 5 })).toBe(false)
    expect(isApprovedCreator(undefined)).toBe(false)
  })
})

describe('computeCreatorStats', () => {
  const tickets = [
    { buyerAddress: '0xA', amount: 10, createdAt: new Date('2026-01-10') },
    { buyerAddress: '0xB', amount: 30, createdAt: new Date('2026-02-15') },
    { buyerAddress: '0xa', amount: 5, createdAt: new Date('2026-03-01') },
  ]

  it('counts unique referred users and total volume', () => {
    const s = computeCreatorStats(tickets, { lifetimeEarned: 22.5, paidOut: 10 })
    expect(s.referredUsers).toBe(2)
    expect(s.referredVolume).toBe(45)
    expect(s.earned).toBe(22.5)
    expect(s.paidOut).toBe(10)
    expect(s.pending).toBe(12.5)
  })

  it('filters performance to a date range', () => {
    const s = computeCreatorStats(tickets, {
      lifetimeEarned: 22.5,
      paidOut: 0,
      from: new Date('2026-02-01'),
      to: new Date('2026-03-01'),
    })
    expect(s.referredUsers).toBe(1)
    expect(s.referredVolume).toBe(30)
    expect(s.pending).toBe(22.5) // balance is all-time
  })

  it('never reports negative pending', () => {
    const s = computeCreatorStats([], { lifetimeEarned: 10, paidOut: 20 })
    expect(s.pending).toBe(0)
  })

  it('handles the empty case', () => {
    const s = computeCreatorStats([], {})
    expect(s).toEqual({ referredUsers: 0, referredVolume: 0, earned: 0, paidOut: 0, pending: 0 })
  })
})
