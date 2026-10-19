import { NextResponse } from 'next/server'
import { verifyMessage } from 'viem'
import {
  ADMIN_HEADERS,
  decodeAdminMessage,
  getAdminWallet,
  normalizeWallet,
  parseAdminMessageTimestamp,
} from '@/lib/admin-wallet'
import { rateLimit } from '@/lib/rate-limit'

export { ADMIN_HEADERS, buildAdminMessage, getAdminWallet, isAdminAddress, encodeAdminMessage } from '@/lib/admin-wallet'

const MESSAGE_MAX_AGE_MS = 10 * 60 * 1000
const CLOCK_SKEW_MS = 60 * 1000

export type AdminAuth =
  | { ok: true; address: string | null; method: 'signature' | 'dev-token' }
  | { ok: false; reason: string }

function isDev(): boolean {
  return process.env.NODE_ENV !== 'production'
}

function devToken(): string {
  return (process.env.ADMIN_DEV_TOKEN || 'dev-admin').trim()
}

export async function verifyAdminAuth(headers: Headers): Promise<AdminAuth> {
  const adminWallet = normalizeWallet(getAdminWallet())
  const wallet = normalizeWallet(headers.get(ADMIN_HEADERS.wallet))
  const message = decodeAdminMessage(headers.get(ADMIN_HEADERS.message))
  const signature = (headers.get(ADMIN_HEADERS.signature) ?? '').trim()
  const token = (headers.get(ADMIN_HEADERS.token) ?? '').trim()

  // Throttle admin authentication attempts by claimed wallet (never by IP).
  const limiterKey = `admin:${wallet || 'anonymous'}`
  const limit = rateLimit(limiterKey, 60, 60_000)
  if (!limit.ok) {
    return { ok: false, reason: 'too many attempts' }
  }

  if (message !== '' && signature !== '') {
    if (wallet === '') return { ok: false, reason: 'missing x-admin-wallet header' }
    if (adminWallet === '') return { ok: false, reason: 'admin wallet not configured' }
    if (wallet !== adminWallet) return { ok: false, reason: 'wallet is not the admin wallet' }
    if (!message.toLowerCase().includes(wallet)) {
      return { ok: false, reason: 'message does not cover the admin wallet' }
    }
    const timestamp = parseAdminMessageTimestamp(message)
    if (timestamp === null) return { ok: false, reason: 'message missing timestamp' }
    const age = Date.now() - timestamp
    if (age > MESSAGE_MAX_AGE_MS) return { ok: false, reason: 'message expired' }
    if (age < -CLOCK_SKEW_MS) return { ok: false, reason: 'message timestamp in the future' }
    try {
      const valid = await verifyMessage({
        address: wallet as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      })
      if (!valid) return { ok: false, reason: 'invalid signature' }
    } catch {
      return { ok: false, reason: 'invalid signature' }
    }
    return { ok: true, address: wallet, method: 'signature' }
  }

  if (token !== '') {
    if (!isDev()) return { ok: false, reason: 'dev token rejected outside development' }
    if (token !== devToken()) return { ok: false, reason: 'invalid dev token' }
    if (adminWallet !== '') {
      if (wallet === '') return { ok: false, reason: 'missing x-admin-wallet header' }
      if (wallet !== adminWallet) return { ok: false, reason: 'wallet is not the admin wallet' }
    }
    return { ok: true, address: wallet || adminWallet || null, method: 'dev-token' }
  }

  return { ok: false, reason: 'not authenticated' }
}

export function adminUnauthorized(reason: string): NextResponse {
  return NextResponse.json({ error: 'Unauthorized', reason }, { status: 401 })
}
