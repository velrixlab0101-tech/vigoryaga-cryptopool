import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'

interface RefundInput {
  ticketId: string
  txHash: string
}

/**
 * Marks tickets as refunded after the operator has sent the money back.
 * Only available for cancelled draws.
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
    const raw = Array.isArray(body?.refunds) ? (body.refunds as RefundInput[]) : []
    if (raw.length === 0) {
      return NextResponse.json({ error: 'No refunds provided' }, { status: 400 })
    }

    const refunds: { ticketId: string; txHash: string }[] = []
    for (const item of raw) {
      const ticketId = typeof item?.ticketId === 'string' ? item.ticketId.trim() : ''
      const txHash = typeof item?.txHash === 'string' ? item.txHash.trim() : ''
      if (!ticketId) {
        return NextResponse.json({ error: 'Each refund needs a ticketId' }, { status: 400 })
      }
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return NextResponse.json({ error: `Invalid txHash for ticket ${ticketId}` }, { status: 400 })
      }
      refunds.push({ ticketId, txHash })
    }

    const draw = await prisma.draw.findUnique({ where: { id } })
    if (!draw) return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    if (draw.status !== 'cancelled') {
      return NextResponse.json({ error: 'Draw must be cancelled before refunding' }, { status: 409 })
    }

    const ticketIds = new Set(
      (await prisma.ticket.findMany({ where: { drawId: id }, select: { id: true } })).map((t) => t.id),
    )

    await prisma.$transaction(async (tx) => {
      for (const r of refunds) {
        if (!ticketIds.has(r.ticketId)) continue
        await tx.ticket.update({
          where: { id: r.ticketId },
          data: { refundTxHash: r.txHash, refundedAt: new Date() },
        })
      }
    })

    return NextResponse.json({ success: true, recorded: refunds.length })
  } catch {
    return NextResponse.json({ error: 'Failed to record refunds' }, { status: 500 })
  }
}
