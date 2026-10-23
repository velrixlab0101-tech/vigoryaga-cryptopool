import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'
import { getToken } from '@/lib/tokens'

interface PayoutInput {
  winnerId: string
  txHash: string
  token?: string
}

/**
 * Records manual, per-winner payouts (each is a real USDC/USDT transfer the
 * operator sent from their wallet). Once every winner has a txHash the draw is
 * marked fully paid.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const raw = Array.isArray(body?.payouts) ? (body.payouts as PayoutInput[]) : []
    if (raw.length === 0) {
      return NextResponse.json({ error: 'No payouts provided' }, { status: 400 })
    }

    const payouts: { winnerId: string; txHash: string; token: string }[] = []
    for (const item of raw) {
      const winnerId = typeof item?.winnerId === 'string' ? item.winnerId.trim() : ''
      const txHash = typeof item?.txHash === 'string' ? item.txHash.trim() : ''
      const token = getToken(item?.token ?? 'USDC')
      if (!winnerId) {
        return NextResponse.json({ error: 'Each payout needs a winnerId' }, { status: 400 })
      }
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return NextResponse.json({ error: `Invalid txHash for winner ${winnerId}` }, { status: 400 })
      }
      if (!token) {
        return NextResponse.json({ error: `Unsupported token for winner ${winnerId}` }, { status: 400 })
      }
      payouts.push({ winnerId, txHash, token: token.symbol })
    }

    const draw = await prisma.draw.findUnique({
      where: { id },
      include: { winners: true },
    })
    if (!draw) return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    if (draw.winners.length === 0) {
      return NextResponse.json({ error: 'No winners declared for this draw' }, { status: 409 })
    }
    if (draw.status === 'cancelled') {
      return NextResponse.json({ error: 'Draw is cancelled' }, { status: 409 })
    }

    const validIds = new Set(draw.winners.map((w) => w.id))

    await prisma.$transaction(async (tx) => {
      for (const p of payouts) {
        if (!validIds.has(p.winnerId)) continue
        await tx.winner.update({
          where: { id: p.winnerId },
          data: { txHash: p.txHash, token: p.token },
        })
      }
      const remaining = await tx.winner.count({ where: { drawId: id, txHash: null } })
      if (remaining === 0) {
        await tx.draw.update({
          where: { id },
          data: { operatorPaid: true, status: 'paid' },
        })
      }
    })

    return NextResponse.json({ success: true, recorded: payouts.length })
  } catch {
    return NextResponse.json({ error: 'Failed to record payouts' }, { status: 500 })
  }
}
