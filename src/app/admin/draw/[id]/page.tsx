'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { motion } from 'framer-motion'
import { isAdminAddress, getAdminWallet, buildAdminFetchHeaders } from '@/lib/admin-client'
import { TOKEN_SYMBOLS, isTokenSymbol, type TokenSymbol } from '@/lib/tokens'
import { computePrizes, computePrizePool } from '@/lib/prizes'
import { errorMessage } from '@/lib/errors'

interface Ticket {
  id: string
  buyerAddress: string
  qty: number
  amount: number
  token: string
  createdAt: string
  refundTxHash: string | null
  refundedAt: string | null
}

interface WinnerAssignment {
  id?: string
  place: number
  wallet: string
  amount: number
  spent: number
  token?: string | null
  txHash?: string | null
}

interface Draw {
  id: string
  title: string
  ticketPrice: number
  operatorFeePct: number
  status: string
  closeTime: string
  tickets: Ticket[]
  winners: WinnerAssignment[]
  prizeStructure: { tier: number; pct?: number; amount?: number }[]
  potTotal: number
  operatorPaid: boolean
  operatorTxHash: string | null
  cancelledAt: string | null
}

const ordinal = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th')

export default function DrawResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const aggregatePlayers = (tickets: Ticket[]) => {
    const map = new Map<string, { wallet: string; qty: number; amount: number }>()
    tickets.forEach((t) => {
      const key = t.buyerAddress.toLowerCase()
      const existing = map.get(key)
      if (existing) {
        map.set(key, {
          wallet: t.buyerAddress,
          qty: existing.qty + t.qty,
          amount: existing.amount + t.amount,
        })
      } else {
        map.set(key, { wallet: t.buyerAddress, qty: t.qty, amount: t.amount })
      }
    })
    const total = Array.from(map.values()).reduce((sum, p) => sum + p.amount, 0)
    return Array.from(map.values())
      .map((p) => ({ ...p, pct: total ? (p.amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }

  const [draw, setDraw] = useState<Draw | null>(null)
  const [players, setPlayers] = useState<{ wallet: string; qty: number; amount: number; pct: number }[]>([])
  const [prizeStructure, setPrizeStructure] = useState<{ tier: number; pct?: number; amount?: number }[]>([
    { tier: 1, pct: 50 },
    { tier: 2, pct: 25 },
    { tier: 3, pct: 15 },
    { tier: 4, pct: 7 },
    { tier: 5, pct: 3 },
  ])
  const [winners, setWinners] = useState<WinnerAssignment[]>([])
  const [operatorFee, setOperatorFee] = useState(10)
  const [useFixed, setUseFixed] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [payoutDrafts, setPayoutDrafts] = useState<Record<string, { txHash: string; token: TokenSymbol }>>({})
  const [refundDrafts, setRefundDrafts] = useState<Record<string, string>>({})

  const load = async () => {
    const p = await params
    try {
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch(`/api/draws/${p.id}`, { headers })
      if (!res.ok) return
      const d: Draw = await res.json()
      setDraw(d)
      setPrizeStructure(d.prizeStructure || prizeStructure)
      setOperatorFee(Number(d.operatorFeePct) || 10)
      setPlayers(aggregatePlayers(d.tickets))
      if (Array.isArray(d.winners) && d.winners.length > 0) {
        setWinners(
          d.winners.map((w) => ({
            id: w.id,
            place: w.place,
            wallet: w.wallet,
            amount: Number(w.amount),
            spent: Number(w.spent),
            token: w.token,
            txHash: w.txHash,
          })),
        )
      }
    } catch {
      /* ignore */
    }
  }

  // Reload once the wallet connects so full (unmasked) winner addresses arrive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [address])

  const calculatePrizes = () => {
    if (!draw) return
    const computed = computePrizes(draw.potTotal, operatorFee, prizeStructure, useFixed)
    setWinners(
      winners.map((w) => {
        const match = computed.find((c) => c.place === w.place)
        return match ? { ...w, amount: match.amount } : w
      }),
    )
  }

  const assignWinner = (player: { wallet: string; amount: number }, place: number) => {
    const existing = winners.find((w) => w.place === place)
    if (existing) {
      setWinners(winners.map((w) => (w.place === place ? { ...w, wallet: player.wallet, spent: player.amount } : w)))
    } else {
      setWinners([...winners, { place, wallet: player.wallet, amount: 0, spent: player.amount }])
    }
  }

  const declareWinners = async () => {
    try {
      setError('')
      setNotice('')
      if (!draw) return
      if (draw.status === 'drawn' || draw.status === 'paid') {
        setError('Winners already declared for this draw')
        return
      }
      if (winners.length === 0) {
        setError('Assign at least one winner')
        return
      }
      if (!useFixed && Math.abs(totalPct - 100) > 0.01) {
        setError(`Prize percentages must total 100% (currently ${totalPct.toFixed(1)}%)`)
        return
      }
      if (useFixed && totalWinnersAmount > prizePoolPreview + 0.01) {
        setError(`Winners total $${totalWinnersAmount.toFixed(2)} exceeds prize pool $${prizePoolPreview.toFixed(2)}`)
        return
      }
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch(`/api/draws/${draw.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ winners, prizeStructure, operatorFeePct: operatorFee }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.reason || data.error || 'Failed to declare winners')
        return
      }
      location.reload()
    } catch (e) {
      setError(errorMessage(e, 'Failed to declare winners'))
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Copied')
      setTimeout(() => setNotice(''), 1500)
    } catch {
      /* ignore */
    }
  }

  const recordPayouts = async (entries: { winnerId: string; txHash: string; token: TokenSymbol }[]) => {
    if (!draw) return
    try {
      setError('')
      setNotice('')
      if (entries.length === 0) {
        setError('Nothing to record')
        return
      }
      for (const e of entries) {
        if (!/^0x[a-fA-F0-9]{64}$/.test(e.txHash)) {
          setError('Enter a valid transaction hash for every payout')
          return
        }
      }
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch(`/api/draws/${draw.id}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ payouts: entries }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.reason || data.error || 'Failed to record payouts')
        return
      }
      load()
    } catch (e) {
      setError(errorMessage(e, 'Failed to record payouts'))
    }
  }

  const recordRefunds = async () => {
    if (!draw) return
    try {
      setError('')
      setNotice('')
      const entries = Object.entries(refundDrafts)
        .filter(([, txHash]) => txHash.trim() !== '')
        .map(([ticketId, txHash]) => ({ ticketId, txHash: txHash.trim() }))
      if (entries.length === 0) {
        setError('Nothing to record')
        return
      }
      for (const e of entries) {
        if (!/^0x[a-fA-F0-9]{64}$/.test(e.txHash)) {
          setError('Enter a valid transaction hash for every refund')
          return
        }
      }
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch(`/api/draws/${draw.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ refunds: entries }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.reason || data.error || 'Failed to record refunds')
        return
      }
      setRefundDrafts({})
      load()
    } catch (e) {
      setError(errorMessage(e, 'Failed to record refunds'))
    }
  }

  const cancelDraw = async () => {
    if (!draw) return
    if (!confirm('Cancel this draw? Ticket holders will need manual refunds.')) return
    try {
      setError('')
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch(`/api/draws/${draw.id}/cancel`, { method: 'POST', headers })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.reason || data.error || 'Failed to cancel draw')
        return
      }
      load()
    } catch (e) {
      setError(errorMessage(e, 'Failed to cancel draw'))
    }
  }

  const isAdmin = isAdminAddress(address)
  const adminWallet = getAdminWallet()

  if (!isAdmin || !draw) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground/70">
        Not authorized {adminWallet ? `(${adminWallet.slice(0, 6)}...${adminWallet.slice(-4)})` : ''}
      </div>
    )
  }

  const totalPct = prizeStructure.reduce((s, t) => s + (t.pct || 0), 0)
  const prizePoolPreview = computePrizePool(draw.potTotal, operatorFee)
  const totalWinnersAmount = winners.reduce((s, w) => s + w.amount, 0)
  const operatorFeeAmount = (draw.potTotal * operatorFee) / 100
  const declared = draw.status === 'drawn' || draw.status === 'paid'
  const cancelled = draw.status === 'cancelled'
  const unpaidWinners = draw.winners.filter((w) => !w.txHash)
  const allPaid = declared && draw.winners.length > 0 && draw.winners.every((w) => w.txHash)

  const csv = draw.winners
    .map((w) => `${w.wallet},${Number(w.amount).toFixed(2)},${w.token || 'USDC'}`)
    .join('\n')

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-2">{draw.title} - Results</h1>
          <p className="text-foreground/70 mb-8">
            Total tickets: {draw.tickets.length} • Players: {players.length} • Pot: ${draw.potTotal.toFixed(2)} USDC
          </p>
        </motion.div>

        {cancelled && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 mb-6 text-sm text-red-300">
            This draw is cancelled. Refund each ticket below (record the payout tx hash when sent).
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-xl p-6 border border-accent/20 mb-6">
              <h2 className="text-xl font-semibold mb-4">Players (by tickets value)</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-foreground/70 text-sm">
                      <th className="text-left py-2">Wallet</th>
                      <th className="text-right py-2">Spent</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">% of pot</th>
                      <th className="text-right py-2">Assign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player, i) => (
                      <tr key={i} className="border-t border-surface">
                        <td className="py-2 font-mono text-sm">
                          {player.wallet.slice(0, 6)}...{player.wallet.slice(-4)}
                        </td>
                        <td className="text-right py-2">${player.amount.toFixed(2)}</td>
                        <td className="text-right py-2">{player.qty}</td>
                        <td className="text-right py-2">{player.pct.toFixed(1)}%</td>
                        <td className="text-right py-2">
                          <select
                            onChange={(e) => e.target.value && assignWinner(player, parseInt(e.target.value))}
                            className="bg-background text-xs p-1 rounded"
                            disabled={declared}
                          >
                            <option value="">Select</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n}
                                {ordinal(n)}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {cancelled && draw.tickets.length > 0 && (
              <div className="bg-surface rounded-xl p-6 border border-accent/20 mb-6">
                <h2 className="text-xl font-semibold mb-4">Refunds</h2>
                <div className="space-y-2">
                  {draw.tickets.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono">
                        {t.buyerAddress.slice(0, 6)}...{t.buyerAddress.slice(-4)}
                      </span>
                      <span className="text-foreground/60">
                        {Number(t.amount).toFixed(2)} {t.token}
                      </span>
                      {t.refundTxHash ? (
                        <span className="text-green-400 text-xs">refunded</span>
                      ) : (
                        <>
                          <button
                            onClick={() => copy(`${t.buyerAddress},${Number(t.amount).toFixed(2)}`)}
                            className="text-accent text-xs hover:underline"
                          >
                            copy
                          </button>
                          <input
                            value={refundDrafts[t.id] || ''}
                            onChange={(e) => setRefundDrafts({ ...refundDrafts, [t.id]: e.target.value })}
                            placeholder="refund tx hash"
                            className="flex-1 min-w-[12rem] bg-background border border-surface px-2 py-1 rounded text-xs font-mono"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={recordRefunds}
                  className="mt-4 bg-accent text-background px-4 py-2 rounded font-semibold hover:bg-accent/90"
                >
                  Record refunds
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="bg-surface rounded-xl p-6 border border-accent/20 mb-6">
              <h2 className="text-xl font-semibold mb-4">Prize Structure</h2>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm">Operator Fee (0–50%)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={operatorFee}
                    onChange={(e) => setOperatorFee(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
                    className="bg-background border border-surface p-1 rounded w-12 text-right"
                    disabled={declared}
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm">Toggle: % / Fixed $</span>
                <button
                  onClick={() => setUseFixed(!useFixed)}
                  disabled={declared}
                  className={`px-2 py-1 rounded text-xs ${useFixed ? 'bg-accent text-background' : 'bg-background'}`}
                >
                  {useFixed ? 'Fixed $' : '%'}
                </button>
              </div>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center justify-between mb-2">
                  <span>
                    {n}
                    {ordinal(n)}
                  </span>
                  <input
                    type="number"
                    value={prizeStructure.find((t) => t.tier === n)?.[useFixed ? 'amount' : 'pct'] || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setPrizeStructure((ps) =>
                        ps.map((t) => (t.tier === n ? { ...t, [useFixed ? 'amount' : 'pct']: val } : t)),
                      )
                    }}
                    className="bg-background border border-surface p-1 rounded w-16 text-right"
                    disabled={declared}
                  />
                  <span>{useFixed ? '$' : '%'}</span>
                </div>
              ))}
              <div className="mt-4 text-sm text-foreground/70">
                {!useFixed && `Total: ${totalPct.toFixed(1)}% (should be 100%)`}
                {useFixed && `Prize pool after fee: $${prizePoolPreview.toFixed(2)}`}
              </div>
              <button
                onClick={calculatePrizes}
                disabled={declared}
                className="mt-4 w-full bg-accent text-background py-2 rounded font-semibold hover:bg-accent/90 disabled:opacity-40"
              >
                Calculate Prizes
              </button>
            </div>

            <div className="bg-surface rounded-xl p-6 border border-accent/20">
              <h2 className="text-xl font-semibold mb-4">Winners</h2>
              {winners.map((w) => {
                const winnerId = w.id || `place-${w.place}`
                return (
                  <div key={winnerId} className="mb-3 p-3 bg-background rounded">
                    <div className="flex justify-between mb-1">
                      <span>
                        {w.place}
                        {ordinal(w.place)}
                      </span>
                      <span className="text-accent font-semibold">${w.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-xs font-mono text-foreground/70 break-all">{w.wallet}</div>
                    <div className="text-xs text-foreground/70 mt-1">
                      Spent: ${w.spent.toFixed(2)} • Gets back: ${(w.amount + w.spent).toFixed(2)}
                    </div>
                    {declared && w.txHash ? (
                      <div className="mt-2 text-xs">
                        <span className="text-green-400">Paid {w.token || 'USDC'}</span>{' '}
                        <a
                          href={`https://bscscan.com/tx/${w.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          {w.txHash.slice(0, 10)}… ↗
                        </a>
                      </div>
                    ) : declared && w.id ? (
                      <div className="mt-2 flex flex-wrap gap-2 items-center text-xs">
                        <button
                          onClick={() => copy(`${w.wallet},${w.amount.toFixed(2)}`)}
                          className="text-accent hover:underline"
                        >
                          copy {w.amount.toFixed(2)}
                        </button>
                        <select
                          value={payoutDrafts[w.id]?.token || 'USDC'}
                          onChange={(e) =>
                            isTokenSymbol(e.target.value) &&
                            setPayoutDrafts((d) => ({
                              ...d,
                              [w.id as string]: { txHash: d[w.id as string]?.txHash || '', token: e.target.value as TokenSymbol },
                            }))
                          }
                          className="bg-surface border border-surface p-1 rounded"
                        >
                          {TOKEN_SYMBOLS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <input
                          value={payoutDrafts[w.id]?.txHash || ''}
                          onChange={(e) =>
                            setPayoutDrafts((d) => ({
                              ...d,
                              [w.id as string]: { txHash: e.target.value, token: d[w.id as string]?.token || 'USDC' },
                            }))
                          }
                          placeholder="payout tx hash"
                          className="flex-1 min-w-[10rem] bg-surface border border-surface px-2 py-1 rounded font-mono"
                        />
                        <button
                          onClick={() =>
                            recordPayouts([
                              {
                                winnerId: w.id as string,
                                txHash: (payoutDrafts[w.id as string]?.txHash || '').trim(),
                                token: payoutDrafts[w.id as string]?.token || 'USDC',
                              },
                            ])
                          }
                          className="border border-accent/40 text-accent px-3 py-1 rounded hover:bg-accent/10"
                        >
                          Record
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })}

              <div className="mt-4 text-xs text-foreground/70">
                Operator fee: ${operatorFeeAmount.toFixed(2)} ({operatorFee}%)
                <br />
                Total winners: ${totalWinnersAmount.toFixed(2)} | Prize pool: ${prizePoolPreview.toFixed(2)}
              </div>

              {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
              {notice && <p className="mt-3 text-green-400 text-sm">{notice}</p>}

              {!declared && !cancelled && (
                <button
                  onClick={declareWinners}
                  className="mt-4 w-full bg-accent text-background py-2 rounded font-semibold hover:bg-accent/90"
                >
                  Declare &amp; Save Winners
                </button>
              )}

              {declared && (
                <>
                  <button
                    onClick={() => copy(csv)}
                    className="mt-3 w-full border border-accent/40 text-accent py-2 rounded font-semibold hover:bg-accent/10"
                  >
                    Copy all (wallet,amount,token)
                  </button>
                  {unpaidWinners.length > 0 && (
                    <button
                      onClick={() =>
                        recordPayouts(
                          unpaidWinners
                            .filter((w) => w.id && payoutDrafts[w.id]?.txHash)
                            .map((w) => ({
                              winnerId: w.id as string,
                              txHash: (payoutDrafts[w.id as string]?.txHash || '').trim(),
                              token: payoutDrafts[w.id as string]?.token || 'USDC',
                            })),
                        )
                      }
                      className="mt-2 w-full bg-green-500 text-background py-2 rounded font-semibold hover:bg-green-400"
                    >
                      Record filled payouts
                    </button>
                  )}
                  {allPaid && (
                    <p className="mt-3 text-center text-sm text-green-400">All winners paid ✓</p>
                  )}
                </>
              )}

              {!cancelled && draw.status !== 'paid' && (
                <button
                  onClick={cancelDraw}
                  className="mt-4 w-full border border-red-500/40 text-red-400 py-2 rounded font-semibold hover:bg-red-500/10"
                >
                  Cancel draw &amp; refund
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
