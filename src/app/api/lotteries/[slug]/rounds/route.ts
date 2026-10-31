import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const lottery = await prisma.lottery.findUnique({ where: { slug } })
    if (!lottery) return NextResponse.json([])
    const rounds = await prisma.lotteryRound.findMany({
      where: { lotteryId: lottery.id, status: { in: ['open', 'closed'] } },
      orderBy: [{ status: 'asc' }, { closeTime: 'asc' }],
    })
    return NextResponse.json(serialize(rounds))
  } catch {
    return NextResponse.json([])
  }
}
