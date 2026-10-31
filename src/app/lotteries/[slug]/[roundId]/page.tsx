'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import LotteryTimer from '@/components/lottery/LotteryTimer'

export default function LotteryRoundPage({ params }: { params: Promise<{ slug: string; roundId: string }> }) {
  const { slug, roundId } = use(params)
  const [round, setRound] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    fetch(`/api/lottery-rounds/${roundId}`).then(r => r.json()).then(setRound).catch(() => {})
  }, [roundId])

  if (!round) return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>

  return (
    <main className="min-h-screen">
      <section className="px-4 pt-10 pb-6">
        <div className="container-page">
          <Link href={`/lotteries/${slug}`} className="text-sm text-muted hover:text-accent">← Back to {slug.replace('-', ' ')}</Link>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{String((round as Record<string,unknown>).title)}</h1>
              <p className="mt-2 text-muted">Ticket ${Number((round as Record<string,unknown>).ticketPrice).toFixed(2)} • Pot ${Number((round as Record<string,unknown>).potTotal || 0).toFixed(2)}</p>
            </div>
            {(round as Record<string,unknown>).closeTime ? <LotteryTimer closeTime={(round as Record<string,unknown>).closeTime as string} /> : null}
          </div>
        </div>
      </section>
      <section className="px-4 pb-20">
        <div className="container-page grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="card p-6">
            <h2 className="text-xl font-semibold">Round Details</h2>
            <p className="mt-2 text-muted">Status: {String((round as Record<string,unknown>).status)}</p>
            <p className="mt-1 text-muted">Entries: {Array.isArray((round as Record<string,unknown>).entries) ? ((round as Record<string,unknown>).entries as any[]).length : 0}</p>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-semibold">Buy Tickets</h2>
            <p className="mt-2 text-sm text-muted">Use the existing draw flow for now, or use /draws for Classic Raffles. This hub supports all 7 formats.</p>
            <Link href="/draws" className="btn btn-primary mt-4 inline-flex">Go to Draws</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
