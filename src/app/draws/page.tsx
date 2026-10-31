'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Draw {
  id: string
  title: string
  ticketPrice: number
  status: string
  closeTime: string
  potTotal: number
  tickets: unknown[]
}

export default function DrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([])
  const [ref, setRef] = useState('')

  useEffect(() => {
    fetch('/api/draws').then(r => r.json()).then(setDraws).catch(() => setDraws([]))
    const code = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') : null
    if (code) setRef(code)
  }, [])

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-4 pt-16 pb-10 sm:pt-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.18),transparent_70%)]" />
          <div className="grid-overlay opacity-60" />
        </div>
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="chip mb-4">Classic Raffles</div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Active <span className="gradient-text">Draws</span></h1>
              <p className="mt-3 max-w-2xl text-lg text-muted">Buy tickets for open draws. Winners paid out via smart contract flow.</p>
            </div>
            <Link href="/lotteries" className="btn btn-ghost">Back to Lottery Hub</Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="container-page">
          {draws.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-xl font-semibold">No active draws</p>
              <p className="mt-2 text-muted">Check back soon for new raffles.</p>
              <Link href="/lotteries" className="btn btn-primary mt-6 inline-flex">Explore Lotteries</Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {draws.map((draw) => (
                <div key={draw.id} className="card card-hover group relative overflow-hidden p-6 sm:p-8">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold sm:text-3xl">{draw.title}</h2>
                        <span className="rounded-full border border-accent/40 px-2.5 py-1 text-xs uppercase tracking-widest text-accent">{draw.status}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
                        <span>Ticket: <span className="text-foreground">${draw.ticketPrice.toFixed(2)}</span></span>
                        <span>Tickets Sold: <span className="text-foreground">{draw.tickets?.length || 0}</span></span>
                        <span>Closes: <span className="text-foreground">{new Date(draw.closeTime).toLocaleString()}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.4em] text-muted">Prize Pool</p>
                        <p className="mt-2 text-4xl font-black text-accent">${Number(draw.potTotal || 0).toLocaleString()}</p>
                      </div>
                      {draw.status === 'open' && (
                        <Link
                          href={`/draws/${draw.id}${ref ? `?ref=${ref}` : ''}`}
                          className="btn btn-primary px-8 py-3 shadow-[0_0_60px_rgba(245,197,66,0.3)]"
                        >
                          Buy Tickets →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-accent/8 blur-3xl transition-opacity group-hover:opacity-90" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
