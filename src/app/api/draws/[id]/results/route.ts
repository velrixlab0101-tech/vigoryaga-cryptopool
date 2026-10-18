import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { winners } = body
    
    for (const winner of winners) {
      await prisma.winner.create({
        data: {
          drawId: id,
          place: winner.place,
          wallet: winner.wallet,
          amount: parseFloat(winner.amount),
          spent: parseFloat(winner.spent || 0),
        },
      })
    }
    
    await prisma.draw.update({
      where: { id },
      data: { status: 'drawn' },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to declare winners' }, { status: 500 })
  }
}
