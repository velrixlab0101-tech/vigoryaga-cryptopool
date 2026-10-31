import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'
import { computeCreditBacks } from '@/lib/credits'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)

  try {
    const { id } = await params
    const body = await request.json()
    const { winners, prizeStructure, operatorFeePct } = body
    
    if (!Array.isArray(winners)) {
      return NextResponse.json({ error: 'Invalid winners' }, { status: 400 })
    }
    
    const draw = await prisma.draw.findUnique({ where: { id } })
    if (!draw) return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    if (draw.status === 'drawn') {
      return NextResponse.json({ error: 'Winners already declared' }, { status: 409 })
    }
    
    const fee = parseFloat(String(operatorFeePct ?? Number(draw.operatorFeePct)))
    if (Number.isNaN(fee) || fee < 0 || fee > 50) {
      return NextResponse.json({ error: 'Operator fee must be 0–50%' }, { status: 400 })
    }

    // Idempotency guard: if credit-back was already issued for this draw we
    // must not double-issue (e.g. a retry after a partial failure).
    const alreadyCredited = await prisma.creditEntry.findFirst({ where: { drawId: id, type: 'creditback' } })

    let credited = 0
    await prisma.$transaction(async (tx) => {
      await tx.draw.update({
        where: { id },
        data: {
          prizeStructure: prizeStructure ?? draw.prizeStructure,
          operatorFeePct: fee,
        },
      })
      for (const winner of winners) {
        await tx.winner.create({
          data: {
            drawId: id,
            place: Number(winner.place),
            wallet: String(winner.wallet),
            amount: Number(winner.amount),
            spent: Number(winner.spent || 0),
          },
        })
      }
      await tx.draw.update({
        where: { id },
        data: { status: 'drawn' },
      })

      // First-5-loss credit-back: losers in this draw get 50% of their spend
      // back as in-app credit (up to their first 5 lost draws). Winners are
      // skipped and consume no slot.
      if (!alreadyCredited) {
        const tickets = await tx.ticket.findMany({
          where: { drawId: id },
          select: { buyerAddress: true, amount: true },
        })
        if (tickets.length > 0) {
          const wallets = [...new Set(tickets.map((t) => t.buyerAddress.toLowerCase()))]
          const usages = await tx.userCredit.findMany({ where: { wallet: { in: wallets } } })
          const usageMap = new Map(usages.map((u) => [u.wallet, u.lossesUsed]))
          const creditBacks = computeCreditBacks(
            tickets.map((t) => ({ buyerAddress: t.buyerAddress, amount: Number(t.amount) })),
            winners.map((w) => String(w.wallet)),
            usageMap,
          )
          for (const cb of creditBacks) {
            await tx.userCredit.upsert({
              where: { wallet: cb.wallet },
              create: {
                wallet: cb.wallet,
                balance: cb.amount,
                lifetimeEarned: cb.amount,
                lossesUsed: 1,
              },
              update: {
                balance: { increment: cb.amount },
                lifetimeEarned: { increment: cb.amount },
                lossesUsed: cb.newLossesUsed,
              },
            })
            await tx.creditEntry.create({
              data: {
                wallet: cb.wallet,
                drawId: id,
                type: 'creditback',
                amount: cb.amount,
                note: '50% credit-back (first 5 losses)',
              },
            })
            credited++
          }
        }
      }
    })
    
    return NextResponse.json({ success: true, credited })
  } catch {
    return NextResponse.json({ error: 'Failed to declare winners' }, { status: 500 })
  }
}
