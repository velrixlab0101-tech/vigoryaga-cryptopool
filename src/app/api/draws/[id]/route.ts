import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'

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
    return NextResponse.json(draw)
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
    const draw = await prisma.draw.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(draw)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update draw' }, { status: 500 })
  }
}
