/**
 * Admin wallet helpers shared by client pages and server code.
 *
 * Env resolution: NEXT_PUBLIC_ADMIN_WALLET first (inlined into the browser
 * bundle by the bundler, so it must be referenced as a literal expression),
 * ADMIN_WALLET as the server-only fallback (unavailable in the browser, which
 * is why the access is guarded).
 */

export const ADMIN_HEADERS = {
  wallet: 'x-admin-wallet',
  message: 'x-admin-message',
  signature: 'x-admin-signature',
  token: 'x-admin-token',
} as const

/** Prefix for the minimal SIWE-style message. */
export const ADMIN_MESSAGE_DOMAIN = 'cryptolottery-admin'

/** Configured admin wallet address, or '' when unset. */
export function getAdminWallet(): string {
  if (typeof process === 'undefined' || !process.env) return ''
  // Literal `process.env.*` references: required for NEXT_PUBLIC_ inlining.
  const published = process.env.NEXT_PUBLIC_ADMIN_WALLET
  const fallback = process.env.ADMIN_WALLET
  return ((typeof published === 'string' && published) || (typeof fallback === 'string' && fallback) || '').trim()
}

/** Trimmed + lowercased address ('' when missing). */
export function normalizeWallet(address?: string | null): string {
  return (address ?? '').trim().toLowerCase()
}

/**
 * True only when an admin wallet is configured and the given address matches
 * it case-insensitively. An empty admin wallet never authorizes anyone.
 */
export function isAdminAddress(address?: string | null): boolean {
  const admin = normalizeWallet(getAdminWallet())
  const candidate = normalizeWallet(address)
  return admin !== '' && candidate !== '' && candidate === admin
}

/**
 * Minimal SIWE-style message: binds the admin wallet to a timestamp so the
 * server can reject stale signatures.
 */
export function buildAdminMessage(address: string, timestamp: number = Date.now()): string {
  return [
    `${ADMIN_MESSAGE_DOMAIN} wants you to sign in with your admin wallet:`,
    address,
    '',
    `Timestamp: ${timestamp}`,
  ].join('\n')
}

/** Extracts the embedded timestamp from a message built by buildAdminMessage. */
export function parseAdminMessageTimestamp(message: string): number | null {
  const match = /(?:^|\n)Timestamp:\s*(\d+)\s*$/.exec(message)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

/**
 * HTTP header values cannot contain newlines, so the (multi-line) signed
 * message travels URI-encoded. The server decodes before verifying.
 */


/** Inverse of encodeAdminMessage; '' when the value is missing/garbled. */
export function decodeAdminMessage(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (raw === '') return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return ''
  }
}

/** Encodes a message so it can be safely sent in an HTTP header (no newlines). */
export function encodeAdminMessage(message: string): string {
  return encodeURIComponent(message)
}
