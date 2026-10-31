import type { Prisma } from '@prisma/client'

export type LotteryType =
  | 'raffle'
  | 'fifty50'
  | 'hourly'
  | 'daily'
  | 'numbermatch'
  | 'keno'
  | 'rollover'

export interface LotteryConfig {
  minPrice?: number
  maxTicketsPerWallet?: number
  autoCloseMinutes?: number
}

export interface RafflePrizeConfig {
  tiers: Array<{ place: number; percent: number }>
}

export interface NumberMatchRules {
  poolMin: number
  poolMax: number
  pickCount: number
  drawCount?: number
  payoutTable?: Array<{ matches: number; percent: number; fixed?: number }>
}

export interface KenoRules {
  poolMin: number
  poolMax: number
  minPick: number
  maxPick: number
  drawCount: number
  payoutTable?: Array<{ matches: number; multiplier: number }>
}

export interface LotteryRoundWithRelations {
  id: string
  lotteryId: string
  title: string
  status: string
  ticketPrice: Prisma.Decimal | number
  startTime: Date
  closeTime: Date
  potTotal: Prisma.Decimal | number
  prizeConfig: unknown
  rules: unknown
  isRollover: boolean
  rolloverAmount: Prisma.Decimal | number
  lottery: {
    slug: string
    name: string
    type: string
    icon: string | null
    description: string | null
  }
  entries: Array<{ qty: number; buyerAddress: string; numbers: unknown; amount: Prisma.Decimal | number }>
  winners: Array<unknown>
}

export function toNumber(v: Prisma.Decimal | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  return Number(v)
}
