import { describe, it, expect } from 'vitest'
import { rateLimit, pruneRateLimits } from '@/lib/rate-limit'
import {
  buildAdminMessage,
  parseAdminMessageTimestamp,
  encodeAdminMessage,
  decodeAdminMessage,
} from '@/lib/admin-wallet'

describe('rateLimit', () => {
  it('allows up to the limit then blocks', () => {
    const key = `test:${Math.random()}`
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).ok).toBe(true)
    }
    const blocked = rateLimit(key, 3, 60_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it('keys are independent', () => {
    const a = `a:${Math.random()}`
    const b = `b:${Math.random()}`
    expect(rateLimit(a, 1, 60_000).ok).toBe(true)
    expect(rateLimit(b, 1, 60_000).ok).toBe(true)
  })

  it('prune does not throw', () => {
    expect(() => pruneRateLimits()).not.toThrow()
  })
})

describe('admin message signing payload', () => {
  it('embeds and recovers a timestamp', () => {
    const ts = 1_700_000_000_000
    const message = buildAdminMessage('0xAbC', ts)
    expect(parseAdminMessageTimestamp(message)).toBe(ts)
    expect(message).toContain('0xAbC')
  })

  it('returns null when no timestamp is present', () => {
    expect(parseAdminMessageTimestamp('hello\nworld')).toBeNull()
  })

  it('round-trips through header encoding', () => {
    const message = buildAdminMessage('0xAbC', Date.now())
    const encoded = encodeAdminMessage(message)
    expect(encoded).not.toContain('\n')
    expect(decodeAdminMessage(encoded)).toBe(message)
  })
})
