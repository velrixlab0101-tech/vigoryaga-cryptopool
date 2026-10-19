import { NextRequest, NextResponse } from 'next/server'
import { decodeEventLog, type Log } from 'viem'
import { prisma } from '@/lib/prisma'
import { clientForChain } from '@/lib/chain'
import { RAFFLE_VAULT_ABI, getVaultAddress, fromUsdcUnits } from '@/lib/contracts'

/**
 * Records a ticket purchase after verifying the on-chain TicketSale event.
 *
 * The client calls RaffleVault.buyTickets(chainDrawId, amount) and then posts
 * the resulting txHash here. We re-derive the buyer + amount from the receipt
 * so a client cannot forge ticket quantities.
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
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: 'Invalid txHash' }, { status: 400 })
    }

    const vault = getVaultAddress()

    const draw = await prisma.draw.findUnique({ where: { id } })
    if (!draw) return NextResponse.json({ error: 'Draw not found' }, { status: 404 })
    if (draw.chainDrawId === null || draw.chainDrawId === undefined) {
      return NextResponse.json({ error: 'Draw has no on-chain id' }, { status: 409 })
    }

    const now = Date.now()
    if (draw.status !== 'open') {
      return NextResponse.json({ error: 'Draw is not open for ticket sales' }, { status: 409 })
    }
    if (now < draw.startTime.getTime()) {
      return NextResponse.json({ error: 'Draw has not started' }, { status: 409 })
    }
    if (now > draw.closeTime.getTime()) {
      return NextResponse.json({ error: 'Draw has closed' }, { status: 409 })
    }

    if (!vault) {
      return NextResponse.json({ error: 'Vault address not configured' }, { status: 500 })
    }

    const existing = await prisma.ticket.findUnique({ where: { txHash } })
    if (existing) {
      return NextResponse.json({ error: 'Transaction already recorded' }, { status: 409 })
    }

    const receipt = await getReceiptWithRetry(txHash as `0x${string}`)
    if (!receipt) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction reverted' }, { status: 400 })
    }

    let sale: { drawId: bigint; buyer: `0x${string}`; amount: bigint } | null = null
    for (const log of receipt.logs as Log[]) {
      if (log.address.toLowerCase() !== vault.toLowerCase()) continue
      try {
        const decoded = decodeEventLog({
          abi: RAFFLE_VAULT_ABI,
          data: log.data,
          topics: log.topics,
        })
        if (decoded.eventName === 'TicketSale') {
          sale = decoded.args as unknown as { drawId: bigint; buyer: `0x${string}`; amount: bigint }
          break
        }
      } catch {
        // not one of our events
      }
    }

    if (!sale) {
      return NextResponse.json({ error: 'No TicketSale event in transaction' }, { status: 400 })
    }
    if (sale.drawId !== BigInt(draw.chainDrawId)) {
      return NextResponse.json({ error: 'TicketSale drawId mismatch' }, { status: 400 })
    }

    const amountDollars = fromUsdcUnits(sale.amount)
    if (amountDollars <= 0) {
      return NextResponse.json({ error: 'Invalid ticket amount' }, { status: 400 })
    }
    const ticketPrice = draw.ticketPrice > 0 ? draw.ticketPrice : 1
    const qty = Math.round(amountDollars / ticketPrice)
    if (qty < 1 || Math.abs(qty * ticketPrice - amountDollars) > 1e-6) {
      return NextResponse.json({ error: 'Amount is not a multiple of ticket price' }, { status: 400 })
    }

    const buyer = sale.buyer.toLowerCase()

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          drawId: draw.id,
          buyerAddress: buyer,
          txHash,
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

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record ticket' }, { status: 500 })
  }
}

type Receipt = {
  status: 'success' | 'reverted'
  chainId: number
  logs: readonly { address: `0x${string}`; data: `0x${string}`; topics: [] | [`0x${string}`, ...`0x${string}`[]] }[]
}

/**
 * Fetches a receipt, retrying briefly because an RPC node may not yet have
 * indexed a very recent transaction.
 */
async function getReceiptWithRetry(txHash: `0x${string}`): Promise<Receipt | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const chainId of [8453, 84532]) {
      const client = clientForChain(chainId)
      if (!client) continue
      try {
        const receipt = await client.getTransactionReceipt({ hash: txHash })
        if (receipt) return receipt as unknown as Receipt
      } catch {
        // not found on this chain / not yet indexed
      }
    }
    await new Promise((r) => setTimeout(r, 750))
  }
  return null
}
