export interface PrizeTier {
  tier: number
  pct?: number
  amount?: number
}

/** Clamps the operator fee to the allowed 0–50% range. */
export function clampOperatorFee(fee: number): number {
  if (!Number.isFinite(fee)) return 0
  return Math.max(0, Math.min(50, fee))
}

/** Prize pool = pot minus the operator fee. */
export function computePrizePool(potTotal: number, operatorFeePct: number): number {
  const fee = clampOperatorFee(operatorFeePct)
  return Math.max(0, potTotal) * (1 - fee / 100)
}

/** Sum of the tier percentages (for validating they total 100). */
export function totalTierPercent(structure: PrizeTier[]): number {
  return structure.reduce((sum, t) => sum + (Number(t.pct) || 0), 0)
}

/**
 * Computes each tier's prize. In percent mode the pool is split by the tier
 * percentages; in fixed mode the tier's `amount` is used verbatim.
 */
export function computePrizes(
  potTotal: number,
  operatorFeePct: number,
  structure: PrizeTier[],
  useFixed: boolean,
): { place: number; amount: number }[] {
  const pool = computePrizePool(potTotal, operatorFeePct)
  return structure
    .slice()
    .sort((a, b) => a.tier - b.tier)
    .map((tier) => {
      const raw = useFixed ? Number(tier.amount) || 0 : pool * ((Number(tier.pct) || 0) / 100)
      return { place: tier.tier, amount: Math.max(0, Number(raw.toFixed(2))) }
    })
}
