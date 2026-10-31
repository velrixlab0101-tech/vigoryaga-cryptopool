'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import LotteryTimer from '@/components/lottery/LotteryTimer'

const INFO: Record<string, { name: string; icon: string; desc: string }> = {
  classic: { name: 'Classic Raffle', icon: '🎟️', desc: '5 winners split the prize pool' },
  'fifty-fifty': { name: '50/50 Draw', icon: '🎯', desc: 'One winner takes 50% of the pot' },
  hourly: { name: 'Hourly Blitz', icon: '⚡', desc: 'Quick hourly draws' },
  daily: { name: 'Daily Jackpot', icon: '🌟', desc: 'Big daily prize pool' },
  'number-match': { name: 'Lotto Number Match', icon: '🎱', desc: 'Pick 6 from 49' },
  keno: { name: 'Keno', icon: '🎲', desc: 'Pick 1-10, 20 drawn from 80' },
  rollover: { name: 'Jackpot Rollover', icon: '💎', desc: 'Jackpot rolls over until won' },
}

export default function LotteryTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [rounds, setRounds] = useState<Array<Record<string, any>>>([])
  const info = INFO[slug] || { name: slug, icon: '🎰', desc: '' }

  useEffect(() => {
    fetch(`/api/lotteries/${slug}/rounds`).then(r => r.json()).then(d => setRounds(Array.isArray(d) ? d : [])).catch(() => setRounds([]))
  }, [slug])

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-4 pt-12 pb-10 sm:pt-16">
        <div className="absolute inset-0 -z-10"><div className="absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.14),transparent_70%)]" /></div>
        <div className="container-page">
          <Link href="/lotteries" className="text-sm text-muted hover:text-accent">← All Lotteries</Link>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent-2/20 text-4xl">{info.icon}</div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{info.name}</h1>
              <p className="mt-1 text-muted">{info.desc}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="px-4 pb-20"><div className="container-page">
        {rounds.length === 0 ? (
          <div className="card p-10 text-center"><p className="text-lg text-muted">No active rounds yet.</p><p className="mt-2 text-sm text-muted">Check back soon.</p><Link href="/lotteries" className="btn btn-primary mt-6 inline-flex">Browse All Lotteries</Link></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rounds.map((r:any)=>(
            <Link key={r.id} href={`/lotteries/${slug}/${r.id}`} className="card card-hover p-6">
              <div className="flex items-center justify-between"><h3 className="font-semibold">{String(r.title)}</h3><span className="chip text-xs">{String(r.status)}</span></div>
              <div className="mt-4 flex items-end justify-between"><div><p className="text-xs text-muted">Prize Pool</p><p className="mt-1 text-2xl font-bold text-accent">\${Number(r.potTotal||0).toLocaleString()}</p></div><div className="text-right"><p className="text-xs text-muted">Ticket Price</p><p className="mt-1 font-semibold">\${Number(r.ticketPrice).toFixed(2)}</p></div></div>
              <div className="mt-4 text-sm text-muted">Closes {new Date(r.closeTime as string).toLocaleString()} • <span className="text-accent">Play Now →</span></div>
            </Link>
          ))}</div>
        )}
      </div></section>
    </main>
  )
}
