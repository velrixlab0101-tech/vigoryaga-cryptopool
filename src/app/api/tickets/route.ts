import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

/** Lists tickets for a wallet, newest first, with the parent draw summary. */
export async function GET(request: NextRequest) {
  try {
    const wallet = (request.nextUrl.searchParams.get('wallet') ?? '').trim().toLowerCase()
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
    }

    const tickets = await prisma.ticket.findMany({
      where: { buyerAddress: wallet },
      orderBy: { createdAt: 'desc' },
      include: {
        draw: {
          select: {
            id: true,
            title: true,
            status: true,
            closeTime: true,
            chainDrawId: true,
          },
        },
      },
    })

    return NextResponse.json(serialize(tickets))
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}
