import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { rateLimit } from '@/lib/rate-limit'
import { PROTECTION_LIMIT } from '@/lib/credits'

/**
 * Returns a wallet's own credit-back balance and history. This is the user's
 * private account data (keyed by their wallet), never another wallet's.
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = (request.nextUrl.searchParams.get('wallet') ?? '').trim().toLowerCase()
    if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
    }
    if (!rateLimit(`credits:${wallet}`, 30, 60_000).ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const credit = await prisma.userCredit.findUnique({ where: { wallet } })
    const entries = await prisma.creditEntry.findMany({
      where: { wallet },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const lossesUsed = credit?.lossesUsed ?? 0
    return NextResponse.json(
      serialize({
        balance: credit?.balance ?? 0,
        lifetimeEarned: credit?.lifetimeEarned ?? 0,
        lossesUsed,
        protectionRemaining: Math.max(0, PROTECTION_LIMIT - lossesUsed),
        entries,
      }),
    )
  } catch {
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 })
  }
}
