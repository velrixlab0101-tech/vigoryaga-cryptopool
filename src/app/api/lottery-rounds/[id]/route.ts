import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const round = await prisma.lotteryRound.findUnique({
      where: { id },
      include: { lottery: true, entries: true, winners: true },
    })
    if (!round) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(serialize(round))
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
