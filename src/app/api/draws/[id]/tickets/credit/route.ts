import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { applyRedeem, round6 } from '@/lib/credits'
import { PAYMENT_CHAIN_ID } from '@/lib/tokens'
import { WALLET_HEADERS, REDEEM_PURPOSE, verifyWalletAuth } from '@/lib/wallet-auth'

/**
 * Spends a wallet's own credit balance on tickets for a draw. Signed by the
 * wallet (no on-chain transfer); the ticket records a synthetic tx hash so the
 * (chainId, txHash) uniqueness check still holds.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body?.wallet === 'string' ? body.wallet.trim().toLowerCase() : ''
    const qty = Math.floor(Number(body?.qty))

    if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
    }
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }

    const authed = await verifyWalletAuth(
      {
        wallet: request.headers.get(WALLET_HEADERS.wallet),
        message: request.headers.get(WALLET_HEADERS.message),
        signature: request.headers.get(WALLET_HEADERS.signature),
      },
      wallet,
      REDEEM_PURPOSE,
    )
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const draw = await prisma.draw.findUnique({ where: { id } })
    if (!draw) return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    if (draw.status !== 'open') {
      return NextResponse.json({ error: 'Draw is not open for ticket sales' }, { status: 409 })
    }
    const now = Date.now()
    if (now < draw.startTime.getTime()) {
      return NextResponse.json({ error: 'Draw has not started' }, { status: 409 })
    }
    if (now > draw.closeTime.getTime()) {
      return NextResponse.json({ error: 'Draw has closed' }, { status: 409 })
    }

    const ticketPrice = Number(draw.ticketPrice) > 0 ? Number(draw.ticketPrice) : 1
    const total = round6(ticketPrice * qty)

    const result = await prisma.$transaction(async (tx) => {
      const credit = await tx.userCredit.findUnique({ where: { wallet } })
      const balance = credit ? Number(credit.balance) : 0
      const applied = applyRedeem(balance, total)
      if (applied <= 0) {
        return { error: 'No credit available' as const, status: 400 }
      }
      if (applied < total - 1e-6) {
        return { error: 'Credit does not cover this purchase' as const, status: 400 }
      }

      const entry = await tx.creditEntry.create({
        data: {
          wallet,
          drawId: id,
          type: 'redeem',
          amount: -applied,
          note: `Redeemed against ${draw.title}`,
        },
      })

      const ticket = await tx.ticket.create({
        data: {
          drawId: id,
          buyerAddress: wallet,
          txHash: `credit:${entry.id}`,
          chainId: PAYMENT_CHAIN_ID,
          token: 'CREDIT',
          qty,
          amount: total,
          creditApplied: applied,
        },
      })

      await tx.userCredit.update({
        where: { wallet },
        data: { balance: { decrement: applied } },
      })
      await tx.draw.update({
        where: { id },
        data: { potTotal: { increment: total } },
      })

      return { ticket, applied }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ success: true, ticket: serialize(result.ticket), creditApplied: result.applied })
  } catch {
    return NextResponse.json({ error: 'Failed to redeem credit' }, { status: 500 })
  }
}
