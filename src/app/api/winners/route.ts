import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Returns winners grouped by draw (newest draw first), each with its
 * five-tier placements. Safe to cache briefly.
 */
export async function GET() {
  try {
    const draws = await prisma.draw.findMany({
      where: { winners: { some: {} } },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        chainDrawId: true,
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
            txHash: true,
          },
        },
      },
      take: 50,
    })

    return NextResponse.json(
      draws.map((d) => ({
        ...d,
        winnerCount: d.winners.length,
        totalAwarded: d.winners.reduce((s, w) => s + w.amount, 0),
      })),
    )
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch winners' }, { status: 500 })
  }
}
