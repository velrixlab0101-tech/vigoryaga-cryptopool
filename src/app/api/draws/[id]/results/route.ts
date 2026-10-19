import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'

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
    })
    
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to declare winners' }, { status: 500 })
  }
}
