'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface HistoryStats {
  totalPaidOut: number
  drawsCompleted: number
  activeDraws: number
  totalTickets: number
  uniquePlayers: number
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface HistoryWinner {
  place: number
  wallet: string
  displayName: string
  amount: number
  token: string | null
  txHash: string | null
}

interface HistoryDraw {
  id: string
  title: string
  status: string
  closeTime: string
  potTotal: number
  ticketPrice: number
  cancelledAt: string | null
  ticketsSold: number
  uniquePlayers: number
  winnerCount: number
  totalAwarded: number
  winners: HistoryWinner[]
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-success/15 text-success border-success/30',
  drawn: 'bg-accent/15 text-accent border-accent/30',
  closed: 'bg-surface-2 text-muted border-border',
  cancelled: 'bg-danger/12 text-danger border-danger/30',
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Paid out',
  drawn: 'Winners drawn',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

const ease = [0.22, 1, 0.36, 1] as const

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Compact page list with ellipses, e.g. 1 … 4 [5] 6 … 7. */
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

function HistoryContent() {
  const searchParams = useSearchParams()
  const initialPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [draws, setDraws] = useState<HistoryDraw[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(initialPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback((target: number) => {
    setLoading(true)
    setError('')
    fetch(`/api/history?page=${target}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('failed')
        return r.json()
      })
      .then((data) => {
        setStats(data.stats ?? null)
        setDraws(Array.isArray(data.draws) ? data.draws : [])
        if (data.pagination) setPagination(data.pagination)
      })
      .catch(() => setError('Could not load draw history.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(page)
  }, [page, load])

  // If someone lands on an out-of-range page (e.g. ?page=99), snap back to
  // the last valid page once the server tells us how many exist.
  useEffect(() => {
    if (pagination && page > pagination.totalPages) {
      setPage(pagination.totalPages)
    }
  }, [pagination, page])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = page > 1 ? `/history?page=${page}` : '/history'
    window.history.replaceState(null, '', url)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  return (
    <div className="min-h-screen px-4 py-14 sm:px-6 lg:px-8">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Draw <span className="gradient-text">history</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Every completed CryptoPool draw, in one place. Payouts are settled on BNB Smart Chain and
            verifiable through the linked transactions.
          </p>
        </motion.div>

        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease }}
            className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5"
          >
            <div className="card px-5 py-4">
              <div className="stat-value text-2xl font-bold text-accent">${money(stats.totalPaidOut)}</div>
              <div className="mt-1 text-xs text-muted">Total paid out</div>
            </div>
            <div className="card px-5 py-4">
              <div className="stat-value text-2xl font-bold">{stats.drawsCompleted}</div>
              <div className="mt-1 text-xs text-muted">Draws completed</div>
            </div>
            <div className="card px-5 py-4">
              <div className="stat-value text-2xl font-bold">{stats.activeDraws}</div>
              <div className="mt-1 text-xs text-muted">Active now</div>
            </div>
            <div className="card px-5 py-4">
              <div className="stat-value text-2xl font-bold">{stats.totalTickets.toLocaleString()}</div>
              <div className="mt-1 text-xs text-muted">Tickets sold</div>
            </div>
            <div className="card px-5 py-4">
              <div className="stat-value text-2xl font-bold">{stats.uniquePlayers.toLocaleString()}</div>
              <div className="mt-1 text-xs text-muted">Players</div>
            </div>
          </motion.div>
        )}

        <div className="mt-12">
          {loading ? (
            <div className="grid gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card h-28 animate-pulse opacity-60" />
              ))}
            </div>
          ) : error ? (
            <div className="card p-8 text-center text-muted">{error}</div>
          ) : draws.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-lg font-semibold">No finished draws yet</p>
              <p className="mt-2 text-muted">The first draw history will appear here once a draw closes.</p>
              <Link href="/draws" className="btn btn-primary mt-6 inline-flex">
                Browse active draws
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {draws.map((d, i) => (
                <motion.article
                  key={d.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.4), ease }}
                  className="card p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold">{d.title}</h2>
                        <span
                          className={`chip border ${STATUS_STYLES[d.status] ?? 'bg-surface-2 text-muted border-border'}`}
                        >
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        Closed {new Date(d.closeTime).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' • '}{d.ticketsSold.toLocaleString()} tickets
                        {' • '}{d.uniquePlayers.toLocaleString()} players
                        {' • '}ticket ${money(d.ticketPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="stat-value text-2xl font-bold">
                        {d.status === 'cancelled' ? '—' : `$${money(d.totalAwarded || d.potTotal)}`}
                      </div>
                      <div className="text-xs text-muted">
                        {d.status === 'cancelled' ? 'Refunded' : 'Awarded'}
                      </div>
                    </div>
                  </div>

                  {d.winners.length > 0 && (
                    <div className="mt-5 grid gap-2 sm:grid-cols-5">
                      {d.winners.map((w) => (
                        <div
                          key={w.place}
                          className="rounded-xl border border-border bg-surface/70 px-3 py-2.5"
                        >
                          <div className="text-[11px] uppercase tracking-wider text-muted">
                            {w.place}
                            {w.place === 1 ? 'st' : w.place === 2 ? 'nd' : w.place === 3 ? 'rd' : 'th'}
                          </div>
                          <div className="mt-0.5 text-sm font-semibold text-accent">
                            ${money(w.amount)}
                          </div>
                          <div className="mt-1 truncate text-sm font-medium">{w.displayName}</div>
                          <div className="truncate font-mono text-[11px] text-muted">{w.wallet}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    {d.winners.length > 0 ? (
                      <Link href={`/winners/${d.id}`} className="text-accent hover:underline">
                        Winner page →
                      </Link>
                    ) : (
                      <span className="text-muted">No winners — {d.status === 'cancelled' ? 'draw cancelled and refunded' : 'not yet drawn'}</span>
                    )}
                    <Link href={`/draws/${d.id}`} className="text-muted hover:text-foreground">
                      Draw details →
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <nav
              aria-label="History pages"
              className="mt-10 flex flex-wrap items-center justify-center gap-2"
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>
              {pageWindow(page, pagination.totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} className="px-2 text-muted">
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
                        ? 'btn btn-primary min-w-10'
                        : 'btn btn-ghost min-w-10'
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
                className="btn btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
              <span className="w-full text-center text-xs text-muted sm:w-auto sm:pl-3">
                Page {page} of {pagination.totalPages} · {pagination.total} draws
              </span>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen px-4 py-20 text-center text-muted">Loading…</div>}>
      <HistoryContent />
    </Suspense>
  )
}
