'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { motion } from 'framer-motion'
import { isAdminAddress, getAdminWallet, buildAdminFetchHeaders } from '@/lib/admin-client'
import { RAFFLE_VAULT_ABI, getVaultAddress, toUsdcUnits } from '@/lib/contracts'

interface Ticket {
  id: string
  buyerAddress: string
  qty: number
  amount: number
  createdAt: string
}

interface Draw {
  id: string
  chainDrawId: number | null
  title: string
  ticketPrice: number
  operatorFeePct: number
  status: string
  closeTime: string
  tickets: Ticket[]
  winners: any[]
  prizeStructure: any[]
  potTotal: number
  operatorPaid: boolean
  operatorTxHash: string | null
}

interface WinnerAssignment {
  place: number
  wallet: string
  amount: number
  spent: number
}

export default function DrawResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { writeContractAsync } = useWriteContract()
  const [payoutHash, setPayoutHash] = useState<`0x${string}` | undefined>()
  const { isSuccess: payoutConfirmed } = useWaitForTransactionReceipt({ hash: payoutHash })
  const [draw, setDraw] = useState<Draw | null>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [prizeStructure, setPrizeStructure] = useState<any[]>([
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
  
  useEffect(() => {
    params.then((p) => {
      fetch(`/api/draws/${p.id}`).then((r) => r.json()).then((d) => {
        setDraw(d)
        setPrizeStructure(d.prizeStructure || prizeStructure)
        setOperatorFee(d.operatorFeePct || 10)
        aggregatePlayers(d.tickets)
        if (Array.isArray(d.winners) && d.winners.length > 0) {
          setWinners(
            d.winners.map((w: any) => ({
              place: w.place,
              wallet: w.wallet,
              amount: w.amount,
              spent: w.spent,
            })),
          )
        }
      })
    })
  }, [])
  
  const aggregatePlayers = (tickets: Ticket[]) => {
    const map = new Map<string, { wallet: string, qty: number, amount: number }>()
    tickets.forEach((t) => {
      const key = t.buyerAddress.toLowerCase()
      if (map.has(key)) {
        const existing = map.get(key)!
        map.set(key, {
          wallet: t.buyerAddress,
          qty: existing.qty + t.qty,
          amount: existing.amount + t.amount,
        })
      } else {
        map.set(key, {
          wallet: t.buyerAddress,
          qty: t.qty,
          amount: t.amount,
        })
      }
    })
    const total = Array.from(map.values()).reduce((sum, p) => sum + p.amount, 0)
    const playersList = Array.from(map.values())
      .map((p) => ({ ...p, pct: total ? (p.amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
    setPlayers(playersList)
  }
  
  const calculatePrizes = () => {
    if (!draw) return
    const totalPot = draw.potTotal
    const prizePool = totalPot * (100 - operatorFee) / 100
    const newWinners: WinnerAssignment[] = winners.map((w) => {
      const tier = prizeStructure.find((t) => t.tier === w.place)
      if (!tier) return w
      const amount = useFixed ? (tier.amount || 0) : (prizePool * (tier.pct || 0) / 100)
      return { ...w, amount: Number(amount.toFixed(2)) }
    })
    setWinners(newWinners)
  }
  
  const assignWinner = (player: any, place: number) => {
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
      if (!draw) return
      if (draw.status === 'drawn') {
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
    } catch (e: any) {
      setError(e?.message || 'Failed to declare winners')
    }
  }
  
  const batchPayout = async () => {
    try {
      setError('')
      if (!draw) return
      const vault = getVaultAddress()
      if (!vault) {
        setError('Vault address not configured (NEXT_PUBLIC_RAFFLE_VAULT)')
        return
      }
      if (draw.chainDrawId === null || draw.chainDrawId === undefined) {
        setError('Draw is missing an on-chain id')
        return
      }
      if (draw.operatorPaid) {
        setError('Payout already recorded for this draw')
        return
      }
      if (winners.length === 0) {
        setError('No winners to pay')
        return
      }
      const paidWinners = winners.filter((w) => w.amount > 0)
      const operators = (adminWallet || address) as `0x${string}` | undefined
      if (!operators) {
        setError('No operator wallet available')
        return
      }
      const hash = await writeContractAsync({
        address: vault,
        abi: RAFFLE_VAULT_ABI,
        functionName: 'payoutBatch',
        args: [
          BigInt(draw.chainDrawId),
          paidWinners.map((w) => w.wallet as `0x${string}`),
          paidWinners.map((w) => toUsdcUnits(w.amount)),
          paidWinners.map((w) => w.place),
          operators,
          toUsdcUnits(operatorFeeAmount),
        ],
      })
      setPayoutHash(hash)
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Payout failed')
    }
  }

  useEffect(() => {
    if (!payoutConfirmed || !payoutHash || !draw) return
    buildAdminFetchHeaders(address, signMessageAsync)
      .then((headers) =>
        fetch(`/api/draws/${draw.id}/payout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ txHash: payoutHash }),
        }),
      )
      .then((res) => {
        if (res?.ok) location.reload()
      })
      .catch(() => {})
  }, [payoutConfirmed, payoutHash])

  const isAdmin = isAdminAddress(address)
  const adminWallet = getAdminWallet()
  
  if (!isAdmin || !draw) {
    return <div className="min-h-screen flex items-center justify-center text-foreground/70">Not authorized {adminWallet ? `(${adminWallet.slice(0,6)}...${adminWallet.slice(-4)})` : ''}</div>
  }
  
  const totalPct = prizeStructure.reduce((s, t) => s + (t.pct || 0), 0)
  const prizePoolPreview = draw.potTotal * (100 - operatorFee) / 100
  const totalWinnersAmount = winners.reduce((s, w) => s + w.amount, 0)
  const operatorFeeAmount = draw.potTotal * operatorFee / 100
  
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-2">{draw.title} - Results</h1>
          <p className="text-foreground/70 mb-8">Total tickets: {draw.tickets.length} • Players: {players.length} • Pot: ${draw.potTotal.toFixed(2)} USDC</p>
        </motion.div>
        
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
                        <td className="py-2 font-mono text-sm">{player.wallet.slice(0, 6)}...{player.wallet.slice(-4)}</td>
                        <td className="text-right py-2">${player.amount.toFixed(2)}</td>
                        <td className="text-right py-2">{player.qty}</td>
                        <td className="text-right py-2">{player.pct.toFixed(1)}%</td>
                        <td className="text-right py-2">
                          <select
                            onChange={(e) => e.target.value && assignWinner(player, parseInt(e.target.value))}
                            className="bg-background text-xs p-1 rounded"
                          >
                            <option value="">Select</option>
                            {[1,2,3,4,5].map(n => (
                              <option key={n} value={n}>{n}{n===1?'st':n===2?'nd':n===3?'rd':'th'}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                    onChange={e => setOperatorFee(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
                    className="bg-background border border-surface p-1 rounded w-12 text-right"
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm">Toggle: % / Fixed $</span>
                <button
                  onClick={() => setUseFixed(!useFixed)}
                  className={`px-2 py-1 rounded text-xs ${useFixed ? 'bg-accent text-background' : 'bg-background'}`}
                >
                  {useFixed ? 'Fixed $' : '%'}
                </button>
              </div>
              {[1,2,3,4,5].map(n => (
                <div key={n} className="flex items-center justify-between mb-2">
                  <span>{n}{n===1?'st':n===2?'nd':n===3?'rd':'th'}</span>
                  <input
                    type="number"
                    value={prizeStructure.find(t => t.tier === n)?.[useFixed ? 'amount' : 'pct'] || 0}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0
                      setPrizeStructure(ps => ps.map(t => t.tier === n ? { ...t, [useFixed ? 'amount' : 'pct']: val } : t))
                    }}
                    className="bg-background border border-surface p-1 rounded w-16 text-right"
                  />
                  <span>{useFixed ? '$' : '%'}</span>
                </div>
              ))}
              <div className="mt-4 text-sm text-foreground/70">
                {!useFixed && `Total: ${totalPct.toFixed(1)}% (should be 100%)`}
                {useFixed && `Prize pool after fee: $${prizePoolPreview.toFixed(2)}`}
              </div>
              <button onClick={calculatePrizes} className="mt-4 w-full bg-accent text-background py-2 rounded font-semibold hover:bg-accent/90">Calculate Prizes</button>
            </div>
            
            <div className="bg-surface rounded-xl p-6 border border-accent/20">
              <h2 className="text-xl font-semibold mb-4">Winners Preview</h2>
              {winners.map(w => (
                <div key={w.place} className="mb-3 p-3 bg-background rounded">
                  <div className="flex justify-between mb-1">
                    <span>{w.place}{w.place===1?'st':w.place===2?'nd':w.place===3?'rd':'th'}</span>
                    <span className="text-accent font-semibold">${w.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-xs font-mono text-foreground/70">{w.wallet.slice(0,6)}...{w.wallet.slice(-4)} • Spent: ${w.spent.toFixed(2)}</div>
                  <div className="text-xs text-foreground/70 mt-1">Gets back: ${(w.amount + w.spent).toFixed(2)} • Net: +${w.amount.toFixed(2)}</div>
                </div>
              ))}
              <div className="mt-4 text-xs text-foreground/70">
                Operator fee: ${operatorFeeAmount.toFixed(2)} USDC ({operatorFee}%)
                <br />
                Total winners: ${totalWinnersAmount.toFixed(2)} USDC | Prize pool: ${prizePoolPreview.toFixed(2)} USDC
              </div>
              {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
              <button
                onClick={declareWinners}
                disabled={draw.status === 'drawn' || draw.status === 'paid'}
                className="mt-4 w-full bg-accent text-background py-2 rounded font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {draw.status === 'drawn' || draw.status === 'paid' ? 'Winners Declared' : 'Declare & Save Winners'}
              </button>
              {(draw.status === 'drawn' || draw.status === 'paid') && (
                <>
                  {draw.status === 'paid' ? (
                    <p className="mt-4 text-center text-sm text-green-400">
                      Payout recorded{draw.operatorTxHash ? ` • ${draw.operatorTxHash.slice(0, 10)}...` : ''}
                    </p>
                  ) : (
                    <button
                      onClick={batchPayout}
                      disabled={!!payoutHash && !payoutConfirmed}
                      className="mt-3 w-full bg-green-500 text-background py-2 rounded font-semibold hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {payoutHash && !payoutConfirmed
                        ? 'Confirming payout...'
                        : 'Batch Payout (winners + fee)'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
