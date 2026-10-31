import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'
import { getTypeDefaults } from '@/lib/lottery-engine'

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)
  const lotteries = await prisma.lottery.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json(serialize({ lotteries }))
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)
  try {
    const body = await req.json()
    const slug = String(body.slug||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'-')
    const type = String(body.type||'raffle')
    const defs = getTypeDefaults(type as any)
    const lottery = await prisma.lottery.create({
      data: {
        slug,
        name: body.name || defs.name,
        type,
        description: body.description || defs.description,
        icon: body.icon || defs.icon,
        isActive: true,
        config: body.config || {},
        prizeConfig: body.prizeConfig || defs.prizeConfig,
      }
    })
    return NextResponse.json(serialize(lottery))
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
