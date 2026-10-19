import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'

export async function GET() {
  try {
    const draws = await prisma.draw.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tickets: true,
        winners: true,
      },
    })
    return NextResponse.json(draws)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch draws' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)

  try {
    const body = await request.json()
    const { title, ticketPrice, operatorFeePct, startTime, closeTime, prizeStructure } = body

    const last = await prisma.draw.findFirst({
      orderBy: { chainDrawId: 'desc' },
      select: { chainDrawId: true },
    })
    const chainDrawId = (last?.chainDrawId ?? 0) + 1

    const draw = await prisma.draw.create({
      data: {
        chainDrawId,
        title,
        ticketPrice: parseFloat(ticketPrice),
        operatorFeePct: parseFloat(operatorFeePct || 10),
        startTime: new Date(startTime),
        closeTime: new Date(closeTime),
        status: 'draft',
        prizeStructure: prizeStructure || [
          { tier: 1, pct: 50 },
          { tier: 2, pct: 25 },
          { tier: 3, pct: 15 },
          { tier: 4, pct: 7 },
          { tier: 5, pct: 3 },
        ],
      },
    })
    return NextResponse.json(draw)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create draw' }, { status: 500 })
  }
}
