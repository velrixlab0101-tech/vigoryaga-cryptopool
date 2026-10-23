import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { publicizeWinners, uniqueBuyers } from '@/lib/mask'

const HISTORY_STATUSES = ['closed', 'drawn', 'paid', 'cancelled']
const PAGE_SIZE = 15

/**
 * Public draw history: finished/cancelled draws with a winner summary, plus
 * lifetime platform stats. Paginated via `?page=` (15 per page). Winner
 * wallets are shortened and buyer addresses removed — this endpoint never
 * requires (and never rewards) auth.
 */
export async function GET(request: NextRequest) {
  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? '1') || 1)
    const [draws, total, totalPaid, drawsCompleted, ticketsAgg, players, activeDraws] =
      await Promise.all([
        prisma.draw.findMany({
          where: { status: { in: HISTORY_STATUSES } },
          orderBy: { closeTime: 'desc' },
          include: {
            tickets: { select: { qty: true, buyerAddress: true } },
            winners: { orderBy: { place: 'asc' } },
          },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.draw.count({ where: { status: { in: HISTORY_STATUSES } } }),
        prisma.winner.aggregate({ _sum: { amount: true } }),
        prisma.draw.count({ where: { winners: { some: {} } } }),
        prisma.ticket.aggregate({ _sum: { qty: true } }),
        prisma.ticket.findMany({ distinct: ['buyerAddress'], select: { buyerAddress: true } }),
        prisma.draw.count({ where: { status: 'open' } }),
      ])

    const payload = {
      stats: {
        totalPaidOut: Number(totalPaid._sum.amount ?? 0),
        drawsCompleted,
        activeDraws,
        totalTickets: Number(ticketsAgg._sum.qty ?? 0),
        uniquePlayers: players.length,
      },
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
      draws: draws.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        closeTime: d.closeTime,
        potTotal: Number(d.potTotal),
        ticketPrice: Number(d.ticketPrice),
        cancelledAt: d.cancelledAt,
        ticketsSold: d.tickets.reduce((s, t) => s + t.qty, 0),
        uniquePlayers: uniqueBuyers(d.tickets),
        winnerCount: d.winners.length,
        totalAwarded: d.winners.reduce((s, w) => s + Number(w.amount), 0),
        winners: publicizeWinners(
          d.winners.map((w) => ({
            place: w.place,
            wallet: w.wallet,
            amount: Number(w.amount),
            token: w.token,
            txHash: w.txHash,
          })),
        ),
      })),
    }

    return NextResponse.json(serialize(payload))
  } catch {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
