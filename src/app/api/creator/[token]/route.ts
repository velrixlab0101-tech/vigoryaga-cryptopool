import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { CREATOR_NOT_FOUND, computeCreatorStats, resolveSharePct } from '@/lib/referrals'

const headers = { 'Cache-Control': 'no-store' }

/**
 * Private creator dashboard data, addressed by the creator's secret token.
 * The response is fully anonymous: it never contains wallet addresses, tx
 * hashes, or the owner address. Unknown/inactive tokens get the uniform 404.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json(CREATOR_NOT_FOUND, { status: 404, headers })
    }
    if (!rateLimit(`creator:${token}`, 60, 60_000).ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers })
    }

    const referral = await prisma.referral.findUnique({ where: { accessToken: token } })
    if (!referral || !referral.isCreator || !referral.active) {
      return NextResponse.json(CREATOR_NOT_FOUND, { status: 404, headers })
    }

    const fromParam = request.nextUrl.searchParams.get('from')
    const toParam = request.nextUrl.searchParams.get('to')
    const from = fromParam ? new Date(fromParam) : null
    const to = toParam ? new Date(toParam) : null

    const tickets = await prisma.ticket.findMany({
      where: { referrerCode: referral.code },
      select: { buyerAddress: true, amount: true, createdAt: true },
    })

    const stats = computeCreatorStats(
      tickets.map((t) => ({
        buyerAddress: t.buyerAddress,
        amount: Number(t.amount),
        createdAt: t.createdAt,
      })),
      {
        lifetimeEarned: Number(referral.earnedCredits),
        paidOut: Number(referral.paidOut),
        from: from && !Number.isNaN(from.getTime()) ? from : null,
        to: to && !Number.isNaN(to.getTime()) ? to : null,
      },
    )

    return NextResponse.json(
      {
        code: referral.code,
        displayName: referral.displayName,
        sharePct: resolveSharePct(referral),
        ...stats,
      },
      { headers },
    )
  } catch {
    return NextResponse.json({ error: 'Failed to fetch creator' }, { status: 500, headers })
  }
}
