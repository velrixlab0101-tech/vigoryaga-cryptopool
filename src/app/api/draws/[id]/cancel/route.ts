import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'

/**
 * Cancels a draw so its tickets can be refunded manually. Blocked once prizes
 * have been paid out.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)

  try {
    const { id } = await params
    const draw = await prisma.draw.findUnique({ where: { id } })
    if (!draw) return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    if (draw.status === 'paid') {
      return NextResponse.json({ error: 'Draw is already paid out' }, { status: 409 })
    }
    if (draw.status === 'cancelled') {
      return NextResponse.json({ success: true, alreadyCancelled: true })
    }

    const updated = await prisma.draw.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    })
    return NextResponse.json({ success: true, draw: { id: updated.id, status: updated.status } })
  } catch {
    return NextResponse.json({ error: 'Failed to cancel draw' }, { status: 500 })
  }
}
