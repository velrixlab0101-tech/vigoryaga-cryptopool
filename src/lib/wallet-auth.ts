import { verifyMessage } from 'viem'

/**
 * Minimal wallet-signature verification for user-scoped, non-transfer actions
 * (e.g. spending one's own credit balance). Mirrors the admin SIWE-style scheme
 * but is generic: the message binds a wallet, a purpose, and a timestamp so a
 * captured signature cannot be replayed for a different action or after expiry.
 */

export const WALLET_MESSAGE_DOMAIN = 'cryptolottery'

/** Purpose string for spending one's own credit balance. */
export const REDEEM_PURPOSE = 'redeem-credit'

const MESSAGE_MAX_AGE_MS = 10 * 60 * 1000
const CLOCK_SKEW_MS = 60 * 1000

export interface WalletAuthHeaders {
  wallet?: string | null
  message?: string | null
  signature?: string | null
}

export function buildWalletMessage(wallet: string, purpose: string, timestamp: number = Date.now()): string {
  return [
    `${WALLET_MESSAGE_DOMAIN} authorizes: ${purpose}`,
    wallet.toLowerCase(),
    `Timestamp: ${timestamp}`,
  ].join('\n')
}

function parseTimestamp(message: string): number | null {
  const match = /(?:^|\n)Timestamp:\s*(\d+)\s*$/.exec(message)
  return match ? Number(match[1]) : null
}

/** HTTP header values cannot contain newlines; messages travel URI-encoded. */
export function encodeWalletMessage(message: string): string {
  return encodeURIComponent(message)
}

/** Inverse of encodeWalletMessage; '' when missing or garbled. */
export function decodeWalletMessage(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (raw === '') return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return ''
  }
}

/**
 * Verifies that `headers` carry a fresh signature from `expectedWallet` over a
 * message for `purpose`. Returns false on any mismatch, expiry, or bad sig.
 */
export async function verifyWalletAuth(
  headers: WalletAuthHeaders,
  expectedWallet: string,
  purpose: string,
): Promise<boolean> {
  const wallet = (headers.wallet ?? '').trim().toLowerCase()
  const message = decodeWalletMessage(headers.message)
  const signature = (headers.signature ?? '').trim()

  if (!/^0x[a-f0-9]{40}$/.test(wallet)) return false
  if (wallet !== expectedWallet.trim().toLowerCase()) return false
  if (message === '' || signature === '') return false
  if (!message.toLowerCase().includes(wallet)) return false
  if (!message.startsWith(`${WALLET_MESSAGE_DOMAIN} authorizes: ${purpose}`)) return false

  const timestamp = parseTimestamp(message)
  if (timestamp === null) return false
  const age = Date.now() - timestamp
  if (age > MESSAGE_MAX_AGE_MS) return false
  if (age < -CLOCK_SKEW_MS) return false

  try {
    return await verifyMessage({
      address: wallet as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })
  } catch {
    return false
  }
}

export const WALLET_HEADERS = {
  wallet: 'x-wallet',
  message: 'x-wallet-message',
  signature: 'x-wallet-signature',
} as const
