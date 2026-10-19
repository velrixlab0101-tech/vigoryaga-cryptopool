import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'

/**
 * Records an on-chain batch payout (winners + operator) for a draw.
 * Idempotent: a draw can only be marked paid once.
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
    const txHash = typeof body?.txHash === 'string' ? body.txHash.trim() : ''
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: 'Invalid txHash' }, { status: 400 })
    }

    const draw = await prisma.draw.findUnique({
      where: { id },
      include: { winners: true },
    })
    if (!draw) return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    if (draw.winners.length === 0) {
      return NextResponse.json({ error: 'No winners declared for this draw' }, { status: 409 })
    }
    if (draw.operatorPaid) {
      return NextResponse.json({ error: 'Draw already paid out' }, { status: 409 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.winner.updateMany({
        where: { drawId: id, txHash: null },
        data: { txHash },
      })
      await tx.draw.update({
        where: { id },
        data: { operatorPaid: true, operatorTxHash: txHash, status: 'paid' },
      })
    })

    return NextResponse.json({ success: true, txHash })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record payout' }, { status: 500 })
  }
}
