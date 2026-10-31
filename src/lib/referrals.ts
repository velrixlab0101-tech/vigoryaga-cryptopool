import { randomBytes } from 'crypto'

/**
 * Creator revenue-share helpers.
 *
 * The creator program is private: only wallets explicitly approved by the
 * operator (isCreator = true, active = true) earn a share, and only they can
 * read their own stats via their secret access token. Everyone else is treated
 * as if the program does not exist.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Share percentage bounds (mirrors the operator-fee clamp). */
export const MIN_SHARE_PCT = 0
export const MAX_SHARE_PCT = 50

/** Human-friendly referral code (unambiguous alphabet). */
export function generateCode(length = 8): string {
  const bytes = randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

/** Unguessable secret token for a creator's private dashboard link (256-bit). */
export function generateAccessToken(): string {
  return randomBytes(32).toString('hex')
}

/** Clamps a share percentage to the allowed range; NaN -> 0. */
export function clampSharePct(value: number): number {
  if (Number.isNaN(value)) return MIN_SHARE_PCT
  return Math.min(MAX_SHARE_PCT, Math.max(MIN_SHARE_PCT, value))
}

export interface CreatorLike {
  isCreator: boolean
  active: boolean
  sharePct: number | string | { toNumber(): number } | null | undefined
}

/** Coerces a Prisma Decimal | number | string | null into a number. */
function toNumber(value: number | string | { toNumber(): number } | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return value.toNumber()
}

/** True only for approved, active creators. */
export function isApprovedCreator(referral: CreatorLike | null | undefined): boolean {
  return Boolean(referral && referral.isCreator && referral.active)
}

/**
 * Share percentage applied to a referred purchase. Unapproved creators earn
 * nothing (0). There is no global default: the operator sets each rate.
 */
export function resolveSharePct(referral: CreatorLike | null | undefined): number {
  if (!isApprovedCreator(referral)) return 0
  return clampSharePct(toNumber(referral?.sharePct))
}

export interface CreatorTicket {
  buyerAddress: string
  amount: number
  createdAt: Date | string
}

export interface CreatorStats {
  referredUsers: number
  referredVolume: number
  earned: number
  paidOut: number
  pending: number
}

function inRange(value: Date | string, from?: Date | null, to?: Date | null): boolean {
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (Number.isNaN(t)) return false
  if (from && t < from.getTime()) return false
  if (to && t >= to.getTime()) return false
  return true
}

/**
 * Aggregates a creator's referred tickets. `earned` is the all-time payable
 * balance derived from custom rates only when `lifetimeEarned` is not supplied;
 * pass `lifetimeEarned`/`paidOut` from the Referral row for the authoritative
 * balance, and use `referredVolume` for range-limited performance.
 */
export function computeCreatorStats(
  tickets: CreatorTicket[],
  opts: { lifetimeEarned?: number; paidOut?: number; from?: Date | null; to?: Date | null } = {},
): CreatorStats {
  const { lifetimeEarned, paidOut = 0, from = null, to = null } = opts
  const inRangeTickets = tickets.filter((t) => inRange(t.createdAt, from, to))

  const users = new Set<string>()
  let volume = 0
  for (const t of inRangeTickets) {
    users.add(t.buyerAddress.toLowerCase())
    volume += t.amount
  }

  const earned = lifetimeEarned ?? tickets.reduce((s, t) => s + t.amount, 0)
  const pending = Math.max(0, earned - paidOut)

  return {
    referredUsers: users.size,
    referredVolume: round6(volume),
    earned: round6(earned),
    paidOut: round6(paidOut),
    pending: round6(pending),
  }
}

/** Rounds to 6 decimal places (matches the Decimal(20,6) columns). */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/**
 * The exact body returned for every non-creator / unknown-token request. It is
 * deliberately identical in all cases so a normal user cannot tell whether the
 * creator program exists, whether a code is registered, or whether a token was
 * once valid.
 */
export const CREATOR_NOT_FOUND = { error: 'Not found' } as const

/** Regexes used to assert responses contain no wallet addresses or tx hashes. */
export const ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/
export const TX_HASH_PATTERN = /0x[a-fA-F0-9]{64}/
