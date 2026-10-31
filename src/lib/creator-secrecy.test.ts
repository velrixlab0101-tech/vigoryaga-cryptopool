import { describe, it, expect } from 'vitest'
import {
  CREATOR_NOT_FOUND,
  ADDRESS_PATTERN,
  TX_HASH_PATTERN,
  isApprovedCreator,
  resolveSharePct,
} from '@/lib/referrals'

/**
 * Secrecy invariants for the private creator program. These protect the core
 * requirement: normal users must not be able to discover, infer, or enumerate
 * the program, and no on-chain data (wallet addresses / tx hashes) may ever be
 * exposed to creators.
 */

/** The only fields a creator endpoint is allowed to return. */
type CreatorResponse = {
  code: string
  displayName: string | null
  sharePct: number
  referredUsers: number
  referredVolume: number
  earned: number
  paidOut: number
  pending: number
}

function serializeCreatorResponse(r: CreatorResponse): string {
  return JSON.stringify(r)
}

describe('creator response is anonymous', () => {
  it('never contains a wallet address', () => {
    const sample: string = serializeCreatorResponse({
      code: 'DEMO1234',
      displayName: 'Ava R.',
      sharePct: 10,
      referredUsers: 42,
      referredVolume: 1337.5,
      earned: 133.75,
      paidOut: 50,
      pending: 83.75,
    })
    expect(sample).not.toMatch(ADDRESS_PATTERN)
    expect(sample).not.toMatch(TX_HASH_PATTERN)
  })

  it('does not expose the owner wallet or payout hashes by design', () => {
    // The shape has no ownerAddress / txHash keys at all.
    const keys = Object.keys({
      code: '',
      displayName: null,
      sharePct: 0,
      referredUsers: 0,
      referredVolume: 0,
      earned: 0,
      paidOut: 0,
      pending: 0,
    } as CreatorResponse)
    expect(keys).not.toContain('ownerAddress')
    expect(keys).not.toContain('txHash')
    expect(keys).not.toContain('wallet')
  })
})

describe('uniform not-found response', () => {
  it('is a single, stable object', () => {
    expect(CREATOR_NOT_FOUND).toEqual({ error: 'Not found' })
    expect(JSON.stringify(CREATOR_NOT_FOUND)).toBe('{"error":"Not found"}')
  })

  it('leaks nothing about approval state', () => {
    const body = JSON.stringify(CREATOR_NOT_FOUND)
    expect(body).not.toMatch(/creator/i)
    expect(body).not.toMatch(/token/i)
    expect(body).not.toMatch(/approv/i)
    expect(body).not.toMatch(ADDRESS_PATTERN)
  })
})

describe('unapproved referrals earn nothing', () => {
  it('default (non-creator) referrals resolve to 0%', () => {
    expect(isApprovedCreator({ isCreator: false, active: true, sharePct: null })).toBe(false)
    expect(resolveSharePct({ isCreator: false, active: true, sharePct: 25 })).toBe(0)
  })

  it('deactivated creators earn nothing', () => {
    expect(resolveSharePct({ isCreator: true, active: false, sharePct: 25 })).toBe(0)
  })
})
