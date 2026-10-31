import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'
import { round6 } from '@/lib/referrals'

/**
 * Records an off-chain creator payout. There is deliberately NO transaction
 * hash: payouts are settled outside the chain so the creator's funding is not
 * traceable to the operator's on-chain wallet.
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
    const amount = round6(Number(body?.amount))
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 200) : null

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const referral = await prisma.referral.findUnique({ where: { id } })
    if (!referral || !referral.isCreator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const pending = round6(Number(referral.earnedCredits) - Number(referral.paidOut))
    if (amount > pending + 1e-6) {
      return NextResponse.json(
        { error: `Amount exceeds pending balance of ${pending}` },
        { status: 400 },
      )
    }

    const payout = await prisma.$transaction(async (tx) => {
      const created = await tx.referralPayout.create({
        data: { referralId: id, amount, note },
      })
      await tx.referral.update({
        where: { id },
        data: { paidOut: { increment: amount } },
      })
      return created
    })

    return NextResponse.json({ success: true, payout: serialize(payout) })
  } catch {
    return NextResponse.json({ error: 'Failed to record payout' }, { status: 500 })
  }
}

/** Lists a creator's off-chain payout history (admin only). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)

  try {
    const { id } = await params
    const payouts = await prisma.referralPayout.findMany({
      where: { referralId: id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(serialize({ payouts }))
  } catch {
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
  }
}
