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
    const { winners } = body
    
    if (!Array.isArray(winners)) {
      return NextResponse.json({ error: 'Invalid winners' }, { status: 400 })
    }
    
    await prisma.$transaction(async (tx) => {
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to declare winners' }, { status: 500 })
  }
}
