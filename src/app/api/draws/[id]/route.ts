import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'
import { serialize } from '@/lib/serialize'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const draw = await prisma.draw.findUnique({
      where: { id },
      include: {
        tickets: true,
        winners: true,
      },
    })
    return NextResponse.json(serialize(draw))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch draw' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.draw.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Draw not found' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (typeof body.title === 'string') data.title = body.title
    if (body.ticketPrice !== undefined) {
      const price = parseFloat(body.ticketPrice)
      if (Number.isNaN(price) || price <= 0) {
        return NextResponse.json({ error: 'Ticket price must be > 0' }, { status: 400 })
      }
      data.ticketPrice = price
    }
    if (body.operatorFeePct !== undefined) {
      const fee = parseFloat(body.operatorFeePct)
      if (Number.isNaN(fee) || fee < 0 || fee > 50) {
        return NextResponse.json({ error: 'Operator fee must be 0–50%' }, { status: 400 })
      }
      data.operatorFeePct = fee
    }
    if (body.startTime !== undefined) data.startTime = new Date(body.startTime)
    if (body.closeTime !== undefined) data.closeTime = new Date(body.closeTime)
    if (body.prizeStructure !== undefined) data.prizeStructure = body.prizeStructure

    if (body.status !== undefined) {
      const allowed = ['draft', 'open', 'closed']
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status change' }, { status: 400 })
      }
      if (body.status === 'open' && existing.status !== 'draft' && existing.status !== 'closed') {
        return NextResponse.json({ error: 'Only draft or closed draws can be opened' }, { status: 409 })
      }
      data.status = body.status
    }

    const draw = await prisma.draw.update({ where: { id }, data })
    return NextResponse.json(serialize(draw))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update draw' }, { status: 500 })
  }
}
