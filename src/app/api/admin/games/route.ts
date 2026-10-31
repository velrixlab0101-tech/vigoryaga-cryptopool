import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { DEFAULT_GAME_CONFIG } from '@/lib/game-config'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req.headers)
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const settings = await prisma.gameSetting.findMany({ orderBy: { gameSlug: 'asc' } })
    if (settings.length === 0) {
      const seeded = await Promise.all(
        Object.entries(DEFAULT_GAME_CONFIG).map(([slug, cfg]) =>
          prisma.gameSetting.create({
            data: {
              gameSlug: slug,
              displayName: slug === 'slots' ? 'Neon Jackpot Slots' : slug === 'dice' ? 'Neon Dice' : slug === 'plinko' ? 'Neon Plinko' : slug === 'mines' ? 'Neon Mines' : slug === 'wheel' ? 'Fortune Wheel' : 'Neon Crash',
              winPercent: cfg.winPercent,
              houseEdge: cfg.houseEdge,
              enabled: cfg.enabled,
              minBet: cfg.minBet,
              maxBet: cfg.maxBet,
            },
          })
        )
      )
      return NextResponse.json({ games: seeded })
    }
    return NextResponse.json({ games: settings })
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req.headers)
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { gameSlug, displayName, winPercent, enabled, minBet, maxBet } = body
    if (!gameSlug) return NextResponse.json({ error: 'missing' }, { status: 400 })
    const wp = Math.max(1, Math.min(99, Number(winPercent)))
    const he = Math.max(1, Math.min(99, 100 - wp))
    const game = await prisma.gameSetting.upsert({
      where: { gameSlug },
      update: {
        displayName: displayName || gameSlug,
        winPercent: wp,
        houseEdge: he,
        enabled: enabled !== false,
        minBet: Number(minBet) || 1,
        maxBet: Number(maxBet) || 100,
      },
      create: {
        gameSlug,
        displayName: displayName || gameSlug,
        winPercent: wp,
        houseEdge: he,
        enabled: enabled !== false,
        minBet: Number(minBet) || 1,
        maxBet: Number(maxBet) || 100,
      },
    })
    return NextResponse.json({ game })
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  return POST(req)
}

export async function PATCH(req: NextRequest) {
  return POST(req)
}
