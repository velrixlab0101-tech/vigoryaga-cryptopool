import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { publicizeWinners } from '@/lib/mask'

const PAGE_SIZE = 5

/**
 * Returns winners grouped by draw (newest draw first), each with its
 * five-tier placements. Paginated via `?page=` (5 draws ≈ 25 winner rows per
 * page). Wallet addresses are shortened to `0xabcd…1234` and paired with a
 * display name — this endpoint is public. Safe to cache briefly.
 */
export async function GET(request: NextRequest) {
  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? '1') || 1)
    const where = { winners: { some: {} } }
    const [draws, total] = await Promise.all([
      prisma.draw.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          potTotal: true,
          operatorFeePct: true,
          prizeStructure: true,
          status: true,
          createdAt: true,
          winners: {
            orderBy: { place: 'asc' },
            select: {
              id: true,
              place: true,
              wallet: true,
              amount: true,
              spent: true,
              token: true,
              txHash: true,
            },
          },
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.draw.count({ where }),
    ])

    return NextResponse.json({
      ...serialize({
        draws: draws.map((d) => ({
          ...d,
          winners: publicizeWinners(d.winners),
          winnerCount: d.winners.length,
          totalAwarded: d.winners.reduce((s, w) => s + Number(w.amount), 0),
        })),
      }),
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch winners' }, { status: 500 })
  }
}
