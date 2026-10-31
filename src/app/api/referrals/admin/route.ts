import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { verifyAdminAuth, adminUnauthorized } from '@/lib/admin-auth'
import { clampSharePct, generateAccessToken, generateCode } from '@/lib/referrals'

/**
 * Admin management of the private creator program. Admin responses are the only
 * place the owner wallet and secret access token are ever returned.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)

  try {
    const creators = await prisma.referral.findMany({
      where: { isCreator: true },
      orderBy: { createdAt: 'desc' },
    })
    const codes = creators.map((c) => c.code)
    const tickets = codes.length
      ? await prisma.ticket.findMany({
          where: { referrerCode: { in: codes } },
          select: { referrerCode: true, buyerAddress: true, amount: true },
        })
      : []

    const byCode = new Map<string, { users: Set<string>; volume: number }>()
    for (const t of tickets) {
      if (!t.referrerCode) continue
      const agg = byCode.get(t.referrerCode) ?? { users: new Set<string>(), volume: 0 }
      agg.users.add(t.buyerAddress.toLowerCase())
      agg.volume += Number(t.amount)
      byCode.set(t.referrerCode, agg)
    }

    return NextResponse.json(
      serialize({
        creators: creators.map((c) => {
          const agg = byCode.get(c.code)
          return {
            id: c.id,
            code: c.code,
            ownerAddress: c.ownerAddress,
            displayName: c.displayName,
            sharePct: c.sharePct,
            accessToken: c.accessToken,
            active: c.active,
            earnedCredits: c.earnedCredits,
            paidOut: c.paidOut,
            referredUsers: agg?.users.size ?? 0,
            referredVolume: agg?.volume ?? 0,
          }
        }),
      }),
    )
  } catch {
    return NextResponse.json({ error: 'Failed to list creators' }, { status: 500 })
  }
}

interface UpsertInput {
  wallet?: string
  sharePct?: number | string
  displayName?: string | null
  active?: boolean
  rotateToken?: boolean
}

/**
 * Promotes a wallet to creator or updates an existing one. A wallet with no
 * Referral row gets a fresh code + 256-bit access token; an existing public
 * referral row is upgraded in place (isCreator = true).
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request.headers)
  if (!auth.ok) return adminUnauthorized(auth.reason)

  try {
    const body = (await request.json().catch(() => ({}))) as UpsertInput
    const wallet = (body?.wallet ?? '').trim().toLowerCase()
    if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
    }

    const sharePct = clampSharePct(Number(body?.sharePct ?? 0))
    const displayName =
      typeof body?.displayName === 'string' && body.displayName.trim()
        ? body.displayName.trim().slice(0, 60)
        : null
    const active = body?.active === undefined ? true : Boolean(body.active)

    let referral = await prisma.referral.findFirst({ where: { ownerAddress: wallet } })

    if (!referral) {
      for (let attempt = 0; attempt < 5 && !referral; attempt++) {
        try {
          referral = await prisma.referral.create({
            data: {
              code: generateCode(),
              ownerAddress: wallet,
              accessToken: generateAccessToken(),
              isCreator: true,
              active,
              sharePct,
              displayName,
            },
          })
        } catch {
          // code collision — retry
        }
      }
      if (!referral) {
        return NextResponse.json({ error: 'Failed to create creator' }, { status: 500 })
      }
    } else {
      referral = await prisma.referral.update({
        where: { id: referral.id },
        data: {
          isCreator: true,
          active,
          sharePct,
          displayName,
          accessToken: referral.accessToken ?? generateAccessToken(),
          ...(body?.rotateToken ? { accessToken: generateAccessToken() } : {}),
        },
      })
    }

    return NextResponse.json(
      serialize({
        id: referral.id,
        code: referral.code,
        ownerAddress: referral.ownerAddress,
        accessToken: referral.accessToken,
        sharePct: referral.sharePct,
        active: referral.active,
      }),
    )
  } catch {
    return NextResponse.json({ error: 'Failed to upsert creator' }, { status: 500 })
  }
}
