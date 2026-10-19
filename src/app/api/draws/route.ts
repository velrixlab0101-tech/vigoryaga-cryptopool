import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'
import { serialize } from '@/lib/serialize'

export async function GET() {
  try {
    const draws = await prisma.draw.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tickets: true,
        winners: true,
      },
    })
    return NextResponse.json(serialize(draws))
  } catch {
    return NextResponse.json({ error: 'Failed to fetch draws' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)

  try {
    const body = await request.json()
    const { title, ticketPrice, operatorFeePct, startTime, closeTime, prizeStructure } = body

    if (typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    const price = parseFloat(ticketPrice)
    if (Number.isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Ticket price must be > 0' }, { status: 400 })
    }
    const fee = parseFloat(operatorFeePct ?? '10')
    if (Number.isNaN(fee) || fee < 0 || fee > 50) {
      return NextResponse.json({ error: 'Operator fee must be 0–50%' }, { status: 400 })
    }
    const start = new Date(startTime)
    const close = new Date(closeTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(close.getTime())) {
      return NextResponse.json({ error: 'Invalid start/close time' }, { status: 400 })
    }
    if (close <= start) {
      return NextResponse.json({ error: 'Close time must be after start time' }, { status: 400 })
    }

    const last = await prisma.draw.findFirst({
      orderBy: { chainDrawId: 'desc' },
      select: { chainDrawId: true },
    })
    const chainDrawId = (last?.chainDrawId ?? 0) + 1

    const draw = await prisma.draw.create({
      data: {
        chainDrawId,
        title: title.trim(),
        ticketPrice: price,
        operatorFeePct: fee,
        startTime: start,
        closeTime: close,
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
    return NextResponse.json(serialize(draw))
  } catch {
    return NextResponse.json({ error: 'Failed to create draw' }, { status: 500 })
  }
}
