#!/usr/bin/env node
/**
 * Seeds realistic-looking historical draws, tickets, winners and referrals.
 *
 * - Deterministic: same output on every run (fixed PRNG seed).
 * - Idempotent: rows created by this script use the `seed_draw_*` id prefix
 *   and are deleted/recreated on each run. Real draws are never touched.
 * - Wallet addresses are synthetic. The public API shortens them to
 *   `0xabcd…1234` and derives a stable pseudonym (`Marcus T.`) from each, so
 *   the site reads like real activity while no full address is ever exposed.
 *
 * Usage:
 *   npm run seed:history
 *   DATABASE_URL=postgresql://... node scripts/seed-history.mjs
 */
import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaNeon } from '@prisma/adapter-neon'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add it to .env or the environment.')
  process.exit(1)
}

// Neon's pooler rejects plain TCP from some networks, so use the serverless
// adapter for Neon hosts and the pg adapter for local/long-lived Postgres.
const adapter = /neon\.tech/.test(connectionString)
  ? new PrismaNeon({ connectionString })
  : new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const DAY = 86_400_000
const now = Date.now()

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(0x5eed2026)
const rand = (min, max) => min + rng() * (max - min)
const randInt = (min, max) => Math.floor(rand(min, max + 1))
const pick = (arr) => arr[Math.floor(rng() * arr.length)]
const chance = (p) => rng() < p
const hex = (input, len) => createHash('sha256').update(input).digest('hex').slice(0, len)
// Addresses look like real EIP-55-cased wallets; tx hashes like real 66-char
// BSC transaction hashes.
const checksum = (hexAddr) => {
  const lower = hexAddr.toLowerCase()
  const hash = createHash('sha256').update(lower).digest('hex')
  let out = '0x'
  for (let i = 0; i < lower.length; i++) {
    out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i]
  }
  return out
}
const wallet = (i) => checksum(hex(`cryptopool-demo-wallet-${i}`, 40))
const fakeTx = (label) => `0x${hex(`cryptopool-demo-tx-${label}`, 64)}`
const round2 = (n) => Math.round(n * 100) / 100

const PLAYERS = Array.from({ length: 420 }, (_, i) => wallet(i))
const PRIZE_STRUCTURE = [
  { tier: 1, pct: 50 },
  { tier: 2, pct: 25 },
  { tier: 3, pct: 15 },
  { tier: 4, pct: 7 },
  { tier: 5, pct: 3 },
]
const TITLE_SERIES = [
  'Weekly Jackpot',
  'Friday Night Draw',
  'Weekend Mega Draw',
  'BNB Builder Draw',
  'Community Jackpot',
  'Golden Ticket Draw',
  'Moonlight Draw',
  'USDC Mega Draw',
]

const REFERRALS = Array.from({ length: 12 }, (_, i) => ({
  code: `DEMO${hex(`referral-${i}`, 4).toUpperCase()}`,
  ownerAddress: PLAYERS[i * 7],
  earnedCredits: round2(rand(3, 48)),
}))
const REFERRAL_CODES = REFERRALS.map((r) => r.code)

function buildDrawTickets(price, playerCount, token) {
  const buyers = new Set()
  while (buyers.size < playerCount) buyers.add(pick(PLAYERS))
  const list = []
  let pot = 0
  for (const buyer of buyers) {
    const roll = rng()
    const qty = roll < 0.5 ? 1 : roll < 0.76 ? 2 : roll < 0.9 ? 3 : randInt(4, 8)
    const amount = round2(qty * price)
    pot += amount
    list.push({ buyer, qty, amount })
  }
  return { list, pot: round2(pot), token }
}

function pickWinners(tickets) {
  const pool = tickets.slice()
  const winners = []
  while (winners.length < 5 && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length)
    winners.push(pool.splice(idx, 1)[0])
  }
  return winners
}

async function main() {
  console.log('Seeding demo history…')

  await prisma.winner.deleteMany({ where: { drawId: { startsWith: 'seed_draw_' } } })
  await prisma.ticket.deleteMany({ where: { drawId: { startsWith: 'seed_draw_' } } })
  await prisma.draw.deleteMany({ where: { id: { startsWith: 'seed_draw_' } } })
  await prisma.referral.deleteMany({ where: { code: { startsWith: 'DEMO' } } })

  // 90 historical draws ≈ 6–7 pages of history at ~14–16 rows per page, and
  // long enough to look like a site that has been running for years.
  const HISTORY_COUNT = 90
  const CANCELLED_EVERY = 11
  let ticketSeq = 0
  let totalTickets = 0
  let totalPot = 0

  for (let i = 0; i < HISTORY_COUNT; i++) {
    const isCancelled = i % CANCELLED_EVERY === CANCELLED_EVERY - 1
    const isClosed = i === HISTORY_COUNT - 1
    const isDrawn = i === HISTORY_COUNT - 2
    const status = isCancelled ? 'cancelled' : isClosed ? 'closed' : isDrawn ? 'drawn' : 'paid'

    const closeDaysAgo = 3 + (HISTORY_COUNT - 1 - i) * 9 + rand(-2, 2)
    const closeTime = new Date(now - closeDaysAgo * DAY)
    const startTime = new Date(closeTime.getTime() - 7 * DAY)

    const price = pick([1, 2, 5])
    const token = chance(0.2) ? 'USDT' : 'USDC'
    const playerCount = randInt(60, 240)
    const { list, pot } = buildDrawTickets(price, playerCount, token)
    const drawId = `seed_draw_${String(i + 1).padStart(2, '0')}`

    totalTickets += list.reduce((s, t) => s + t.qty, 0)
    totalPot += pot

    const title = `${TITLE_SERIES[i % TITLE_SERIES.length]} #${60 + i}`

    await prisma.draw.create({
      data: {
        id: drawId,
        title,
        ticketPrice: price,
        operatorFeePct: 10,
        startTime,
        closeTime,
        status,
        prizeStructure: PRIZE_STRUCTURE,
        potTotal: pot,
        cancelledAt: isCancelled ? new Date(closeTime.getTime() + DAY) : null,
        createdAt: startTime,
        tickets: {
          create: list.map((t) => {
            const seq = ticketSeq++
            const boughtAt = new Date(
              startTime.getTime() + rand(0, closeTime.getTime() - startTime.getTime()),
            )
            return {
              buyerAddress: t.buyer,
              txHash: fakeTx(`ticket-${seq}`),
              chainId: 56,
              token,
              qty: t.qty,
              amount: t.amount,
              referrerCode: i > 2 && chance(0.18) ? pick(REFERRAL_CODES) : null,
              refundTxHash: isCancelled ? fakeTx(`refund-${seq}`) : null,
              refundedAt: isCancelled ? new Date(closeTime.getTime() + DAY) : null,
              createdAt: boughtAt,
            }
          }),
        },
      },
    })

    if (status === 'paid' || status === 'drawn') {
      const pool = round2(pot * 0.9)
      const winners = pickWinners(list)
      const paidOut = status === 'paid'
      await prisma.winner.createMany({
        data: winners.map((w, idx) => ({
          drawId,
          place: idx + 1,
          wallet: w.buyer,
          amount: round2((pool * PRIZE_STRUCTURE[idx].pct) / 100),
          spent: w.amount,
          token,
          // Synthetic winners intentionally have no on-chain payout hash so
          // the UI never links to a non-existent BscScan transaction.
          txHash: null,
        })),
      })
      if (paidOut) {
        await prisma.draw.update({
          where: { id: drawId },
          data: { operatorPaid: true },
        })
      }
    }

    console.log(
      `  ${drawId} · ${title} · ${status} · $${pot.toFixed(2)} pot · ${playerCount} players`,
    )
  }

  await prisma.referral.createMany({ data: REFERRALS })

  const openDraw = await prisma.draw.findFirst({
    where: { status: 'open', NOT: { id: { startsWith: 'seed_draw_' } } },
  })
  if (!openDraw) {
    const LIVE = [
      { title: 'Weekly Jackpot #150', price: 5, closeIn: 4, players: [90, 140], token: 'USDC' },
      { title: 'Friday Night Draw #151', price: 2, closeIn: 9, players: [60, 110], token: 'USDT' },
      { title: 'Weekend Mega Draw #152', price: 10, closeIn: 2, players: [120, 200], token: 'USDC' },
      { title: 'Community Jackpot #153', price: 1, closeIn: 14, players: [40, 90], token: 'USDC' },
    ]
    for (let i = 0; i < LIVE.length; i++) {
      const cfg = LIVE[i]
      const startTime = new Date(now - (2 + i) * DAY)
      const closeTime = new Date(now + cfg.closeIn * DAY)
      const playerCount = randInt(cfg.players[0], cfg.players[1])
      const { list, pot } = buildDrawTickets(cfg.price, playerCount, cfg.token)
      const drawId = i === 0 ? 'seed_draw_live' : `seed_draw_live_${i}`
      await prisma.draw.create({
        data: {
          id: drawId,
          title: cfg.title,
          ticketPrice: cfg.price,
          operatorFeePct: 10,
          startTime,
          closeTime,
          status: 'open',
          prizeStructure: PRIZE_STRUCTURE,
          potTotal: pot,
          createdAt: startTime,
          tickets: {
            create: list.map((t) => {
              const seq = ticketSeq++
              return {
                buyerAddress: t.buyer,
                txHash: fakeTx(`ticket-${seq}`),
                chainId: 56,
                token: cfg.token,
                qty: t.qty,
                amount: t.amount,
                referrerCode: chance(0.18) ? pick(REFERRAL_CODES) : null,
                createdAt: new Date(startTime.getTime() + rand(0, now - startTime.getTime())),
              }
            }),
          },
        },
      })
      totalTickets += list.reduce((s, t) => s + t.qty, 0)
      totalPot += pot
      console.log(`  ${drawId} · ${cfg.title} · open · $${pot.toFixed(2)} pot · ${playerCount} players`)
    }
  } else {
    console.log(`  open draw already exists (${openDraw.id}) — left untouched`)
  }

  console.log(
    `Done: ${HISTORY_COUNT} historical draws, ${totalTickets} tickets, $${totalPot.toFixed(2)} total volume, ${REFERRALS.length} referrals.`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
