'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Celebration } from '@/components/Celebration'
import { ordinal } from '@/lib/mask'

interface Winner {
  id: string
  place: number
  wallet: string
  displayName: string
  amount: number
  spent: number
  token: string | null
  txHash: string | null
}

interface DrawWinners {
  id: string
  title: string
  potTotal: number
  status: string
  createdAt: string
  winners: Winner[]
  winnerCount: number
  totalAwarded: number
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const PLACE_STYLES: Record<number, string> = {
  1: 'from-yellow-400/30 to-yellow-600/10 border-yellow-400/40',
  2: 'from-slate-300/25 to-slate-500/10 border-slate-300/40',
  3: 'from-amber-600/25 to-amber-800/10 border-amber-600/40',
  4: 'from-accent/15 to-accent/5 border-accent/30',
  5: 'from-accent/15 to-accent/5 border-accent/30',
}

/** Compact page list with ellipses, e.g. 1 … 4 [5] 6 … 20. */
function pageWindow(current: number, total: number): (number | '…')[] {
  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
}

function WinnersContent() {
  const searchParams = useSearchParams()
  const initialPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const [draws, setDraws] = useState<DrawWinners[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(initialPage)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)

  const load = useCallback((target: number) => {
    setLoading(true)
    setRevealed(false)
    fetch(`/api/winners?page=${target}`)
      .then((r) => r.json())
      .then((d) => {
        const rows = Array.isArray(d) ? d : (d?.draws ?? [])
        setDraws(Array.isArray(rows) ? rows : [])
        if (d?.pagination) setPagination(d.pagination)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(page)
  }, [page, load])

  useEffect(() => {
    if (pagination && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.history.replaceState(null, '', page > 1 ? `/winners?page=${page}` : '/winners')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  const latest = draws[0]
  const rest = draws.slice(1)

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-5xl font-bold mb-2 text-center"
        >
          Winners <span className="gradient-text">history</span>
        </motion.h1>
        <p className="text-center text-foreground/70 mb-4">
          Every payout is a public on-chain transfer on BNB Smart Chain. Winners are shown with a display
          name and a shortened address for privacy.
        </p>
        <p className="text-center mb-10">
          <Link href="/history" className="text-accent text-sm hover:underline">
            Full draw history (pots, players, refunds) →
          </Link>
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
              <Celebration run={revealed} />
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-accent mb-1">Latest draw</p>
                  <h2 className="text-2xl font-semibold">{latest.title}</h2>
                  <p className="text-foreground/60 text-sm">
                    Pot ${latest.potTotal.toFixed(2)} • {latest.winnerCount} winners
                  </p>
                </div>
                <div className="flex gap-2">
                  {!revealed && (
                    <button
                      onClick={() => setRevealed(true)}
                      className="bg-accent text-background px-6 py-2 rounded-lg font-semibold hover:bg-accent/90"
                    >
                      Reveal winners
                    </button>
                  )}
                  <Link
                    href={`/winners/${latest.id}`}
                    className="border border-accent/40 text-accent px-6 py-2 rounded-lg font-semibold hover:bg-accent/10"
                  >
                    Shareable page →
                  </Link>
                </div>
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
                            <div className="text-[11px] text-foreground/50 mb-1">{w.token || 'USDC'}</div>
                            <div className="truncate text-sm font-semibold">{w.displayName}</div>
                            <div className="truncate font-mono text-[11px] text-foreground/50">{w.wallet}</div>
                            <div className="text-[11px] text-foreground/50 mt-1">
                              Spent ${w.spent.toFixed(2)} · Net +${w.amount.toFixed(2)}
                            </div>
                            {w.txHash && (
                              <a
                                href={`https://bscscan.com/tx/${w.txHash}`}
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

            {rest.map((d) => (
              <section key={d.id} className="mb-8">
                <h3 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-lg font-semibold">
                  <span className="min-w-0 truncate">{d.title}</span>
                  <span className="text-sm font-normal text-foreground/50">
                    {new Date(d.createdAt).toLocaleDateString()} · ${d.totalAwarded.toFixed(2)} awarded
                  </span>
                </h3>
                <div className="overflow-x-auto bg-surface rounded-xl border border-accent/20">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-foreground/50 text-left">
                        <th className="py-2 px-4">Place</th>
                        <th className="py-2 px-4">Winner</th>
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
                          <td className="py-2 px-4">
                            <div className="font-medium leading-tight">{w.displayName}</div>
                            <div className="font-mono text-[11px] text-foreground/50">{w.wallet}</div>
                          </td>
                          <td className="py-2 px-4 text-right text-accent">
                            ${w.amount.toFixed(2)} {w.token || 'USDC'}
                          </td>
                          <td className="py-2 px-4 text-right text-foreground/60">${w.spent.toFixed(2)}</td>
                          <td className="py-2 px-4 text-right">
                            {w.txHash ? (
                              <a
                                href={`https://bscscan.com/tx/${w.txHash}`}
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

            {pagination && pagination.totalPages > 1 && (
              <nav
                aria-label="Winners pages"
                className="mt-10 flex flex-wrap items-center justify-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="border border-accent/30 text-foreground px-4 py-2 rounded-lg text-sm hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>
                {pageWindow(page, pagination.totalPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`gap-${i}`} className="px-1 text-foreground/40">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      aria-current={p === page ? 'page' : undefined}
                      className={
                        p === page
                          ? 'bg-accent text-background px-4 py-2 rounded-lg text-sm font-semibold min-w-10'
                          : 'border border-accent/30 text-foreground px-4 py-2 rounded-lg text-sm hover:bg-accent/10 min-w-10'
                      }
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="border border-accent/30 text-foreground px-4 py-2 rounded-lg text-sm hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
                <span className="w-full text-center text-xs text-foreground/50 sm:w-auto sm:pl-3">
                  Page {page} of {pagination.totalPages} · {pagination.total} draws
                </span>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function WinnersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen py-20 text-center text-foreground/60">Loading…</div>
      }
    >
      <WinnersContent />
    </Suspense>
  )
}
