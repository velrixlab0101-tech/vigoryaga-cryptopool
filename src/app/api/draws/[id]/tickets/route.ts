import { NextRequest, NextResponse } from 'next/server'
import { decodeEventLog, type Log } from 'viem'
import { prisma } from '@/lib/prisma'
import { serialize } from '@/lib/serialize'
import { clientForChain } from '@/lib/chain'
import {
  ERC20_ABI,
  PAYMENT_CHAIN_ID,
  fromTokenUnits,
  getPaymentAddresses,
  getToken,
} from '@/lib/tokens'

/**
 * Records a ticket purchase after verifying a direct ERC-20 deposit.
 *
 * The buyer sends USDC/USDT to the operator's payment address on BSC, then
 * posts the txHash here. We re-derive the sender, token and amount from the
 * receipt's `Transfer` logs, so a client cannot forge tickets.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const txHash = typeof body?.txHash === 'string' ? body.txHash.trim() : ''
    const referrerCode = typeof body?.referrerCode === 'string' ? body.referrerCode.trim() : null
    const token = getToken(typeof body?.token === 'string' ? body.token : 'USDC')
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: 'Invalid txHash' }, { status: 400 })
    }
    if (!token) {
      return NextResponse.json({ error: 'Unsupported token' }, { status: 400 })
    }

    const operators = getPaymentAddresses()
    if (operators.length === 0) {
      return NextResponse.json({ error: 'Payment address not configured' }, { status: 500 })
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

    const existing = await prisma.ticket.findUnique({
      where: { chainId_txHash: { chainId: PAYMENT_CHAIN_ID, txHash } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Transaction already recorded' }, { status: 409 })
    }

    const receipt = await getReceiptWithRetry(txHash as `0x${string}`)
    if (!receipt) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction reverted' }, { status: 400 })
    }

    const tokenAddress = token.address.toLowerCase()
    const senders = new Set<string>()
    let total = BigInt(0)

    for (const log of receipt.logs as Log[]) {
      if (log.address.toLowerCase() !== tokenAddress) continue
      try {
        const decoded = decodeEventLog({ abi: ERC20_ABI, data: log.data, topics: log.topics })
        if (decoded.eventName !== 'Transfer') continue
        const args = decoded.args as unknown as { from: `0x${string}`; to: `0x${string}`; value: bigint }
        if (!operators.includes(args.to.toLowerCase())) continue
        senders.add(args.from.toLowerCase())
        total += args.value
      } catch {
        // not a Transfer event we can decode
      }
    }

    if (total <= BigInt(0)) {
      return NextResponse.json(
        { error: `No ${token.symbol} transfer to the payment address found` },
        { status: 400 }
      )
    }
    if (senders.size !== 1) {
      return NextResponse.json({ error: 'Deposit must come from a single wallet' }, { status: 400 })
    }

    const amountDollars = fromTokenUnits(total, token.decimals)
    const ticketPrice = Number(draw.ticketPrice) > 0 ? Number(draw.ticketPrice) : 1
    const qty = Math.round(amountDollars / ticketPrice)
    if (qty < 1 || Math.abs(qty * ticketPrice - amountDollars) > 1e-6) {
      return NextResponse.json({ error: 'Amount is not a multiple of ticket price' }, { status: 400 })
    }

    const buyer = [...senders][0]

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          drawId: draw.id,
          buyerAddress: buyer,
          txHash,
          chainId: PAYMENT_CHAIN_ID,
          token: token.symbol,
          qty,
          amount: amountDollars,
          referrerCode,
        },
      })
      await tx.draw.update({
        where: { id: draw.id },
        data: { potTotal: { increment: amountDollars } },
      })
      if (referrerCode) {
        const referral = await tx.referral.findUnique({ where: { code: referrerCode } })
        if (referral && referral.ownerAddress.toLowerCase() !== buyer) {
          const pct = Math.min(50, Math.max(0, parseFloat(process.env.REFERRAL_PCT || '5')))
          await tx.referral.update({
            where: { id: referral.id },
            data: { earnedCredits: { increment: amountDollars * (pct / 100) } },
          })
        }
      }
      return created
    })

    return NextResponse.json({ success: true, ticket: serialize(ticket) })
  } catch {
    return NextResponse.json({ error: 'Failed to record ticket' }, { status: 500 })
  }
}

type Receipt = {
  status: 'success' | 'reverted'
  logs: readonly { address: `0x${string}`; data: `0x${string}`; topics: [] | [`0x${string}`, ...`0x${string}`[]] }[]
}

/**
 * Fetches a receipt from BNB Smart Chain, retrying briefly because the RPC
 * node may not yet have indexed a very recent transaction.
 */
async function getReceiptWithRetry(txHash: `0x${string}`): Promise<Receipt | null> {
  const client = clientForChain(PAYMENT_CHAIN_ID)
  if (!client) return null
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash })
      if (receipt) return receipt as unknown as Receipt
    } catch {
      // not found yet / not indexed
    }
    await new Promise((r) => setTimeout(r, 900))
  }
  return null
}
