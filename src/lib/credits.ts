/**
 * First-5-loss credit-back protection.
 *
 * For a user's first 5 _lost_ draws, they are credited 50% of the amount they
 * spent in that draw. Winning a draw neither credits nor consumes a slot.
 * Credits are an in-app balance redeemable against future tickets (no on-chain
 * payment is made).
 */

/** Number of lost draws that qualify for credit-back. */
export const PROTECTION_LIMIT = 5

/** Fraction of spend returned as credit. */
export const CREDIT_BACK_RATE = 0.5

export interface CreditTicket {
  buyerAddress: string
  amount: number
}

export interface CreditUsage {
  /** Lowercased wallet -> number of protection slots already used. */
  lossesUsed: Map<string, number> | Record<string, number>
}

export interface CreditBack {
  wallet: string
  amount: number
  previousLossesUsed: number
  newLossesUsed: number
}

function usedFor(usages: CreditUsage['lossesUsed'], wallet: string): number {
  if (usages instanceof Map) return usages.get(wallet) ?? 0
  return usages[wallet] ?? 0
}

/**
 * Computes the credit-back owed to each losing wallet for a single draw.
 *
 * - Winners (any wallet in `winnerWallets`) get nothing and consume no slot.
 * - A wallet with `lossesUsed >= PROTECTION_LIMIT` gets nothing.
 * - Otherwise: 50% of the wallet's total spend in the draw, and the wallet's
 *   slot count increments by one (per draw, regardless of ticket count).
 */
export function computeCreditBacks(
  tickets: CreditTicket[],
  winnerWallets: Iterable<string>,
  usages: CreditUsage['lossesUsed'],
): CreditBack[] {
  const winners = new Set<string>()
  for (const w of winnerWallets) winners.add(w.toLowerCase())

  const spendByWallet = new Map<string, number>()
  for (const t of tickets) {
    const wallet = t.buyerAddress.toLowerCase()
    spendByWallet.set(wallet, (spendByWallet.get(wallet) ?? 0) + t.amount)
  }

  const out: CreditBack[] = []
  for (const [wallet, spend] of spendByWallet) {
    if (winners.has(wallet)) continue
    const previous = usedFor(usages, wallet)
    if (previous >= PROTECTION_LIMIT) continue
    out.push({
      wallet,
      amount: round6(spend * CREDIT_BACK_RATE),
      previousLossesUsed: previous,
      newLossesUsed: previous + 1,
    })
  }
  return out
}

/** Credit actually applied to a purchase: capped at the balance. */
export function applyRedeem(balance: number, total: number): number {
  return round6(Math.max(0, Math.min(balance, total)))
}

/** Rounds to 6 decimal places (matches the Decimal(20,6) columns). */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6
}
