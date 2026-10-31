import type { LotteryRoundWithRelations } from './types'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromRound(roundId: string, closeTime: Date) {
  let h = 0
  const s = roundId + ':' + closeTime.toISOString()
  for (let i = 0; i < s.length; i++) {
    h = ((h * 131542391) ^ s.charCodeAt(i)) >>> 0
  }
  return h
}

export function drawRaffleWinners(round: LotteryRoundWithRelations, count = 5) {
  const pool: Array<{ buyerAddress: string; spent: number; weight: number }> = []
  for (const e of round.entries) {
    const spent = typeof e.amount === 'number' ? e.amount : Number(e.amount)
    for (let i = 0; i < e.qty; i++) pool.push({ buyerAddress: e.buyerAddress, spent, weight: 1 })
  }
  const rng = mulberry32(seedFromRound(round.id, round.closeTime))
  const winners: Array<{ wallet: string; spent: number; place: number }> = []
  const used = new Set<number>()
  while (winners.length < count && pool.length > 0) {
    let idx = Math.floor(rng() * pool.length)
    let guard = 0
    while (used.has(idx) && guard < pool.length) {
      idx = Math.floor(rng() * pool.length)
      guard++
    }
    if (used.has(idx)) break
    used.add(idx)
    const entry = pool[idx]
    winners.push({ wallet: entry.buyerAddress, spent: entry.spent, place: winners.length + 1 })
  }
  return winners
}

export function drawFiftyFifty(round: LotteryRoundWithRelations) {
  return drawRaffleWinners(round, 1).map((w, i) => ({ ...w, place: i + 1 }))
}

export function drawNumberMatch(round: LotteryRoundWithRelations) {
  const rules = (round.rules as any) || { poolMin: 1, poolMax: 49, pickCount: 6, drawCount: 6 }
  const poolMin = rules.poolMin ?? 1
  const poolMax = rules.poolMax ?? 49
  const drawCount = rules.drawCount ?? rules.pickCount ?? 6
  const rng = mulberry32(seedFromRound(round.id, round.closeTime))
  const drawn = new Set<number>()
  while (drawn.size < drawCount) {
    drawn.add(Math.floor(rng() * (poolMax - poolMin + 1)) + poolMin)
  }
  const drawnArr = Array.from(drawn).sort((a, b) => a - b)
  const results: Array<{ wallet: string; numbers: number[]; matches: number; spent: number; qty: number }> = []
  for (const e of round.entries) {
    const nums = Array.isArray(e.numbers) ? (e.numbers as any[]).map(Number).filter((n) => !Number.isNaN(n)) : []
    const set = new Set(drawnArr)
    const matches = nums.filter((n) => set.has(n)).length
    const spent = typeof e.amount === 'number' ? e.amount : Number(e.amount)
    results.push({ wallet: e.buyerAddress, numbers: nums, matches, spent, qty: e.qty })
  }
  results.sort((a, b) => b.matches - a.matches || a.spent - b.spent)
  return { drawn: drawnArr, results }
}

export function drawKeno(round: LotteryRoundWithRelations) {
  const rules = (round.rules as any) || { poolMin: 1, poolMax: 80, drawCount: 20 }
  const poolMin = rules.poolMin ?? 1
  const poolMax = rules.poolMax ?? 80
  const drawCount = rules.drawCount ?? 20
  const rng = mulberry32(seedFromRound(round.id, round.closeTime))
  const drawn = new Set<number>()
  while (drawn.size < drawCount) {
    drawn.add(Math.floor(rng() * (poolMax - poolMin + 1)) + poolMin)
  }
  const drawnArr = Array.from(drawn).sort((a, b) => a - b)
  const results: Array<{ wallet: string; numbers: number[]; matches: number; spent: number }> = []
  for (const e of round.entries) {
    const nums = Array.isArray(e.numbers) ? (e.numbers as any[]).map(Number).filter((n) => !Number.isNaN(n)) : []
    const set = new Set(drawnArr)
    const matches = nums.filter((n) => set.has(n)).length
    const spent = typeof e.amount === 'number' ? e.amount : Number(e.amount)
    results.push({ wallet: e.buyerAddress, numbers: nums, matches, spent })
  }
  return { drawn: drawnArr, results }
}

export function getTypeDefaults(type: string) {
  switch (type) {
    case 'fifty50':
      return { name: '50/50 Draw', description: 'One winner takes half the pot.', icon: '🎯', prizeConfig: { mode: 'fifty50' } }
    case 'hourly':
      return { name: 'Hourly Blitz', description: 'Fast-paced draws every hour.', icon: '⚡', prizeConfig: { tiers: [{ place: 1, percent: 90 }] } }
    case 'daily':
      return { name: 'Daily Jackpot', description: 'Big daily prize pool with huge payouts.', icon: '🌟', prizeConfig: { tiers: [{ place: 1, percent: 80 }, { place: 2, percent: 10 }, { place: 3, percent: 10 }] } }
    case 'numbermatch':
      return { name: 'Lotto Number Match', description: 'Pick your numbers and match to win.', icon: '🎱', rules: { poolMin: 1, poolMax: 49, pickCount: 6, drawCount: 6 }, prizeConfig: { tiers: [{ matches: 6, percent: 50 }, { matches: 5, percent: 25 }, { matches: 4, percent: 15 }, { matches: 3, percent: 10 }] } }
    case 'keno':
      return { name: 'Keno', description: 'Pick up to 10 numbers and watch 20 get drawn.', icon: '🎲', rules: { poolMin: 1, poolMax: 80, minPick: 1, maxPick: 10, drawCount: 20 }, prizeConfig: { payout: 'multiplier' } }
    case 'rollover':
      return { name: 'Jackpot Rollover', description: 'Jackpot grows every round until someone wins big.', icon: '💎', prizeConfig: { tiers: [{ place: 1, percent: 70 }, { place: 2, percent: 15 }, { place: 3, percent: 10 }, { place: 4, percent: 3 }, { place: 5, percent: 2 }] } }
    default:
      return { name: 'Classic Raffle', description: '5 winners share the prize pool.', icon: '🎟️', prizeConfig: { tiers: [{ place: 1, percent: 50 }, { place: 2, percent: 25 }, { place: 3, percent: 15 }, { place: 4, percent: 7 }, { place: 5, percent: 3 }] } }
  }
}
