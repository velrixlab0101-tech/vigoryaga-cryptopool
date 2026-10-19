'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface Winner {
  id: string
  place: number
  wallet: string
  amount: number
  spent: number
  txHash: string | null
}

interface DrawWinners {
  id: string
  chainDrawId: number | null
  title: string
  potTotal: number
  status: string
  createdAt: string
  winners: Winner[]
  winnerCount: number
  totalAwarded: number
}

const ordinal = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th')

const PLACE_STYLES: Record<number, string> = {
  1: 'from-yellow-400/30 to-yellow-600/10 border-yellow-400/40',
  2: 'from-slate-300/25 to-slate-500/10 border-slate-300/40',
  3: 'from-amber-600/25 to-amber-800/10 border-amber-600/40',
  4: 'from-accent/15 to-accent/5 border-accent/30',
  5: 'from-accent/15 to-accent/5 border-accent/30',
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function WinnersPage() {
  const [draws, setDraws] = useState<DrawWinners[]>([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    fetch('/api/winners')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setDraws(d)
      })
      .finally(() => setLoading(false))
  }, [])

  const latest = draws[0]

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-5xl font-bold mb-2 text-center"
        >
          Winners
        </motion.h1>
        <p className="text-center text-foreground/70 mb-10">
          Every payout is a public on-chain transfer on Base.
        </p>

        {loading ? (
          <p className="text-center text-foreground/60">Loading…</p>
        ) : !latest ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-accent/20">
            <p className="text-foreground/70">No winners drawn yet.</p>
            <Link href="/draws" className="inline-block mt-4 text-accent hover:underline">
              See active draws →
            </Link>
          </div>
        ) : (
          <>
            <section className="bg-surface rounded-2xl border border-accent/20 p-6 sm:p-8 mb-12">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-accent mb-1">Latest draw</p>
                  <h2 className="text-2xl font-semibold">{latest.title}</h2>
                  <p className="text-foreground/60 text-sm">
                    Pot ${latest.potTotal.toFixed(2)} • {latest.winnerCount} winners
                  </p>
                </div>
                {!revealed && (
                  <button
                    onClick={() => setRevealed(true)}
                    className="bg-accent text-background px-6 py-2 rounded-lg font-semibold hover:bg-accent/90"
                  >
                    Reveal winners
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <AnimatePresence>
                  {[1, 2, 3, 4, 5].map((place, i) => {
                    const w = latest.winners.find((x) => x.place === place)
                    const visible = revealed
                    return (
                      <motion.div
                        key={place}
                        initial={false}
                        animate={
                          visible
                            ? { opacity: 1, rotateY: 0 }
                            : { opacity: 0.35, rotateY: 90 }
                        }
                        transition={{ delay: visible ? i * 0.25 : 0, duration: 0.5 }}
                        className={`rounded-xl border bg-gradient-to-br p-4 text-center ${
                          w ? PLACE_STYLES[place] : 'from-surface to-surface border-surface'
                        }`}
                      >
                        <div className="text-sm text-foreground/60 mb-2">
                          {place}
                          {ordinal(place)} place
                        </div>
                        {visible && w ? (
                          <>
                            <div className="text-2xl font-bold text-accent mb-1">
                              ${w.amount.toFixed(2)}
                            </div>
                            <div className="font-mono text-xs text-foreground/70">{short(w.wallet)}</div>
                            <div className="text-[11px] text-foreground/50 mt-1">
                              Spent ${w.spent.toFixed(2)} · Net +${w.amount.toFixed(2)}
                            </div>
                            {w.txHash && (
                              <a
                                href={`https://basescan.org/tx/${w.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-[11px] text-accent/80 hover:underline mt-1"
                              >
                                view tx ↗
                              </a>
                            )}
                          </>
                        ) : (
                          <div className="text-2xl font-bold text-foreground/30">?</div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </section>

            {draws.slice(1).map((d) => (
              <section key={d.id} className="mb-8">
                <h3 className="text-lg font-semibold mb-3">
                  {d.title}
                  <span className="text-foreground/50 text-sm font-normal ml-2">
                    {new Date(d.createdAt).toLocaleDateString()} · ${d.totalAwarded.toFixed(2)} awarded
                  </span>
                </h3>
                <div className="overflow-x-auto bg-surface rounded-xl border border-accent/20">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-foreground/50 text-left">
                        <th className="py-2 px-4">Place</th>
                        <th className="py-2 px-4">Wallet</th>
                        <th className="py-2 px-4 text-right">Prize</th>
                        <th className="py-2 px-4 text-right">Spent</th>
                        <th className="py-2 px-4 text-right">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.winners.map((w) => (
                        <tr key={w.id} className="border-t border-surface">
                          <td className="py-2 px-4">
                            {w.place}
                            {ordinal(w.place)}
                          </td>
                          <td className="py-2 px-4 font-mono text-xs">{short(w.wallet)}</td>
                          <td className="py-2 px-4 text-right text-accent">${w.amount.toFixed(2)}</td>
                          <td className="py-2 px-4 text-right text-foreground/60">${w.spent.toFixed(2)}</td>
                          <td className="py-2 px-4 text-right">
                            {w.txHash ? (
                              <a
                                href={`https://basescan.org/tx/${w.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                              >
                                ↗
                              </a>
                            ) : (
                              <span className="text-foreground/30">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
