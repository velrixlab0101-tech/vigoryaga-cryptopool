import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { rateLimit } from '@/lib/rate-limit'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(length = 8): string {
  const bytes = randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

/**
 * Returns the referral code (and stats) for a wallet, creating one on first
 * use. `?wallet=` is required.
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = (request.nextUrl.searchParams.get('wallet') ?? '').trim().toLowerCase()
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
    }

    if (!rateLimit(`referral:${wallet}`, 15, 60_000).ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let referral = await prisma.referral.findFirst({ where: { ownerAddress: wallet } })
    if (!referral) {
      for (let attempt = 0; attempt < 5 && !referral; attempt++) {
        try {
          referral = await prisma.referral.create({
            data: { code: generateCode(), ownerAddress: wallet },
          })
        } catch {
          // code collision — retry
        }
      }
    }
    if (!referral) {
      return NextResponse.json({ error: 'Failed to create referral code' }, { status: 500 })
    }

    const tickets = await prisma.ticket.findMany({
      where: { referrerCode: referral.code },
      select: { buyerAddress: true, amount: true },
    })
    const signupCount = new Set(tickets.map((t) => t.buyerAddress)).size
    const referredVolume = tickets.reduce((s, t) => s + Number(t.amount), 0)

    return NextResponse.json(
      serialize({
      code: referral.code,
      ownerAddress: referral.ownerAddress,
      earnedCredits: referral.earnedCredits,
      signupCount,
      referredVolume,
    }),
    )
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch referral' }, { status: 500 })
  }
}
