'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Countdown } from '@/components/Countdown'

interface Draw {
  id: string
  title: string
  ticketPrice: number
  status: string
  closeTime: string
  potTotal: number
  prizeStructure: { tier: number; pct?: number; amount?: number }[]
  tickets: { qty: number; buyerAddress?: string | null }[]
  uniquePlayers?: number
}

interface Testimonial {
  name: string
  quote: string
  role: string
  avatar: string
}

const ease = [0.22, 1, 0.36, 1] as const

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Alex J.',
    quote: 'Cleanest raffle I’ve used. Deposits show up fast on BNB Smart Chain and payouts are public.',
    role: 'Crypto OG',
    avatar: 'A',
  },
  {
    name: 'Maya R.',
    quote: 'Love the transparency — I can see every tx on BNB Smart Chain. Keeps it fair.',
    role: 'DeFi user',
    avatar: 'M',
  },
  {
    name: 'Jon K.',
    quote: 'Simple UX, USDC/USDT both work great. Pulled my prize straight to wallet.',
    role: 'NFT collector',
    avatar: 'J',
  },
  {
    name: 'Sam T.',
    quote: 'No approval headaches. Send, confirm, done. Really solid experience.',
    role: 'Trader',
    avatar: 'S',
  },
  {
    name: 'Taylor W.',
    quote: 'Love the animations and how transparent the prize split is.',
    role: 'Builder',
    avatar: 'T',
  },
  {
    name: 'Jordan P.',
    quote: 'Best-looking draw site on BNB Smart Chain. The timer + reveal hits hard.',
    role: 'Power user',
    avatar: 'J',
  },
]

const STEPS = [
  {
    title: 'Get your tickets',
    desc: 'Send USDC or USDT on BNB Smart Chain — your entry is verified on-chain.',
    icon: '🎫',
  },
  {
    title: 'Draw closes',
    desc: 'The pot is locked the moment the timer runs out.',
    icon: '⏳',
  },
  {
    title: 'Winners revealed',
    desc: '5 winners get their share. Every payout is public on BNB Smart Chain.',
    icon: '🎉',
  },
]

const FEATURES = [
  { title: 'BNB Smart Chain native', desc: 'Lightning-fast, low-fee with USDC & USDT.', icon: '⚡' },
  { title: 'Fully verifiable', desc: 'Deposit and payout hashes, visible for anyone.', icon: '🔒' },
  { title: 'Fair 5-tier split', desc: 'You can see the prize structure before buying.', icon: '📊' },
  { title: 'Manual payouts', desc: 'Winners receive funds directly from the operator.', icon: '💸' },
  { title: 'Zero tracking', desc: 'No visitor IP logging — privacy by design.', icon: '🛡️' },
  { title: 'Built for trust', desc: 'Clean UI, auditable history, public explorer links.', icon: '✨' },
]

interface PastWin {
  id: string
  title: string
  total: number
  date: string
  top: { place: number; wallet: string; displayName: string; amount: number; token: string | null }[]
}

interface WinnersApiResponse {
  id: string
  title: string
  totalAwarded: number
  createdAt: string
  winners: { place: number; wallet: string; displayName: string; amount: number; token: string | null }[]
}

interface LifetimeStats {
  totalPaidOut: number
  drawsCompleted: number
  totalTickets: number
  uniquePlayers: number
}

export default function Home() {
  const [draw, setDraw] = useState<Draw | null>(null)
  const [allDraws, setAllDraws] = useState<Draw[]>([])
  const [past, setPast] = useState<PastWin[]>([])
  const [lifetime, setLifetime] = useState<LifetimeStats | null>(null)

  useEffect(() => {
    Promise.all([fetch('/api/draws'), fetch('/api/winners'), fetch('/api/history')])
      .then(async ([dRes, wRes, hRes]) => {
        const draws: Draw[] = await dRes.json().catch(() => [])
        const winnersPayload = await wRes.json().catch(() => null)
        const winnersData: WinnersApiResponse[] = Array.isArray(winnersPayload)
          ? winnersPayload
          : (winnersPayload?.draws ?? [])
        const history = await hRes.json().catch(() => null)
        if (history?.stats) setLifetime(history.stats as LifetimeStats)
        if (Array.isArray(draws)) setAllDraws(draws)
        const active = Array.isArray(draws) ? (draws.find((d) => d.status === 'open') ?? draws[0] ?? null) : null
        setDraw(active)
        if (Array.isArray(winnersData)) {
          setPast(
            winnersData.slice(0, 8).map((dw) => ({
              id: dw.id,
              title: dw.title,
              total: Number(dw.totalAwarded ?? 0),
              date: dw.createdAt,
              top: (dw.winners ?? []).slice(0, 5).map((w) => ({
                place: w.place,
                wallet: w.wallet,
                displayName: w.displayName,
                amount: Number(w.amount),
                token: w.token ?? null,
              })),
            })),
          )
        }
      })
  }, [])

  const openDraws = useMemo(
    () =>
      allDraws.filter((d) => d.status === 'open' || d.status === 'closed' || d.status === 'draft'),
    [allDraws],
  )

  const stats = useMemo(() => {
    const tickets = draw?.tickets ?? []
    const qty = tickets.reduce((s, t) => s + (t.qty || 0), 0)
    const players =
      typeof draw?.uniquePlayers === 'number'
        ? draw.uniquePlayers
        : new Set(tickets.map((t) => t.buyerAddress?.toLowerCase())).size
    return { qty, players, pot: draw?.potTotal ?? 0, price: draw?.ticketPrice ?? 0 }
  }, [draw])

  const href = draw ? `/draws/${draw.id}` : '/draws'
  const potLabel = stats.pot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const slides = past.slice(0, 6)

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4500)
    return () => clearInterval(t)
  }, [paused, slides.length])

  useEffect(() => {
    if (slide >= slides.length) setSlide(0)
  }, [slide, slides.length])

  const go = (dir: number) => {
    if (slides.length <= 1) return
    setSlide((s) => (s + dir + slides.length) % slides.length)
  }

  return (
    <div className="relative overflow-hidden">
      <section className="relative isolate overflow-hidden px-4 pt-16 pb-24 sm:pt-24">
        <div className="aurora" aria-hidden />
        <div className="grid-overlay" aria-hidden />

        <div className="container-page relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="mb-8 inline-flex items-center gap-2"
          >
            <span className="chip">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              {draw?.status === 'open' ? 'Live draw' : 'CryptoPool on BNB Smart Chain'}
            </span>
          </motion.div>

          <div className="grid gap-12">
            <div className="min-w-0">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease }}
                className="text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
              >
                The <span className="gradient-text">smartest</span> way to win on-chain
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.08, ease }}
                className="mt-6 max-w-xl text-lg text-muted"
              >
                Join the next CryptoPool draw with USDC or USDT. Transparent pot, public winners, direct payouts.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.14, ease }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <Link href={href} className="btn btn-primary w-full sm:w-auto">
                  {draw?.status === 'open' ? 'Enter current draw' : 'Browse draws'}
                </Link>
                <Link href="/winners" className="btn btn-ghost w-full sm:w-auto">
                  View winners
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.18, ease }}
                className="mt-10 grid gap-4 sm:grid-cols-4"
              >
                <div className="card px-5 py-4">
                  <div className="stat-value text-2xl font-bold text-accent sm:text-3xl">${potLabel}</div>
                  <div className="mt-1 text-xs text-muted">Current pot</div>
                </div>
                <div className="card px-5 py-4">
                  <div className="stat-value text-2xl font-bold sm:text-3xl">{stats.qty.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-muted">Tickets sold</div>
                </div>
                <div className="card px-5 py-4">
                  <div className="stat-value text-2xl font-bold sm:text-3xl">{stats.players.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-muted">Unique players</div>
                </div>
                <div className="card px-5 py-4">
                  <div className="stat-value text-2xl font-bold sm:text-3xl">${stats.price.toFixed(2)}</div>
                  <div className="mt-1 text-xs text-muted">Per ticket</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {lifetime && lifetime.drawsCompleted > 0 && (
        <section className="relative border-y border-border bg-background-2/40 px-4 py-8">
          <div className="container-page grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: 'Paid out to winners', value: `$${lifetime.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: 'Draws completed', value: lifetime.drawsCompleted.toLocaleString() },
              { label: 'Tickets sold', value: lifetime.totalTickets.toLocaleString() },
              { label: 'Players joined', value: lifetime.uniquePlayers.toLocaleString() },
            ].map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <div className="stat-value text-2xl font-bold text-accent sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="relative px-4 py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-3 text-muted">No approvals. No friction. Just send, get in, and watch the draw.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease }}
                className="card card-hover p-6"
              >
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-accent/12 text-2xl">{s.icon}</div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Step {i + 1}</div>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-16">
        <div className="container-page">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="card relative overflow-hidden p-8 sm:p-10"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.4fr,1fr] lg:items-center">
              <div>
                <div className="chip mb-4">New player protection</div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Lose your first 5 draws? Get 50% back.
                </h2>
                <p className="mt-4 text-muted">
                  Every new player is covered. If your first five draws don&apos;t land a prize,
                  we credit <span className="text-accent font-semibold">50% of everything you spent</span>{' '}
                  on those draws straight back to your balance — automatically, the moment winners
                  are drawn. No forms, no waiting.
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    'Auto-credited on every losing draw',
                    'Up to five losing draws covered',
                    'Spend credit on any future draw',
                    'Win at any point? Protection simply ends',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted">
                      <span className="mt-0.5 text-accent">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href="/draws" className="btn btn-primary">
                    Start playing
                  </Link>
                </div>
              </div>
              <div className="card glass p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Example
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Draw 1 — lost</span>
                    <span className="text-foreground/80">$10 spent</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Draw 2 — lost</span>
                    <span className="text-foreground/80">$20 spent</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Draw 3 — lost</span>
                    <span className="text-foreground/80">$15 spent</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <span className="font-semibold">Credit back (50%)</span>
                    <span className="stat-value text-2xl font-bold text-accent">$22.50</span>
                  </div>
                  <p className="text-xs text-muted">
                    Credited automatically when those draws are drawn — ready to spend on your next
                    tickets.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative px-4 py-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="chip mb-3">Lottery Hub</div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">7 Ways To Win</h2>
              <p className="mt-2 text-muted">Classic raffles, 50/50, hourly blitzes, daily jackpots, lotto & keno.</p>
            </div>
            <Link href="/lotteries" className="btn btn-primary">View All Lotteries →</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[['🎟️','Classic Raffle','/lotteries/classic'],['🎯','50/50 Draw','/lotteries/fifty-fifty'],['⚡','Hourly Blitz','/lotteries/hourly'],['💎','Jackpot Rollover','/lotteries/rollover']].map(([icon,name,href])=>(
              <Link key={href} href={href} className="card card-hover p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-2xl">{icon}</div>
                <p className="font-semibold">{name}</p>
                <p className="mt-1 text-xs text-accent">Play Now →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {openDraws.length > 0 && (
        <section className="relative px-4 py-16">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Live &amp; upcoming draws
                </h2>
                <p className="mt-2 text-muted">
                  Pick a draw, buy tickets with USDC or USDT, and watch the pot grow.
                </p>
              </div>
              <Link href="/draws" className="btn btn-ghost">
                All draws →
              </Link>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {openDraws.slice(0, 6).map((d, i) => {
                const tickets = d.tickets ?? []
                const sold = tickets.reduce((s, t) => s + (t.qty || 0), 0)
                const players =
                  typeof d.uniquePlayers === 'number'
                    ? d.uniquePlayers
                    : new Set(tickets.map((t) => t.buyerAddress?.toLowerCase())).size
                const pot = d.potTotal ?? 0
                const isOpen = d.status === 'open'
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5, delay: i * 0.06, ease }}
                    className="card card-hover group relative flex flex-col overflow-hidden p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 flex-1 break-words text-lg font-semibold leading-snug">{d.title}</h3>
                      <span
                        className={`chip shrink-0 ${
                          isOpen
                            ? 'border-success/30 bg-success/15 text-success'
                            : 'border-border bg-surface-2 text-muted'
                        }`}
                      >
                        {isOpen ? 'Live' : d.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="stat-value text-3xl font-black text-accent">
                        ${pot.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-xs text-muted">pot</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-border bg-surface/70 px-3 py-2">
                        <div className="font-semibold">{sold.toLocaleString()}</div>
                        <div className="text-xs text-muted">Tickets</div>
                      </div>
                      <div className="rounded-xl border border-border bg-surface/70 px-3 py-2">
                        <div className="font-semibold">{players.toLocaleString()}</div>
                        <div className="text-xs text-muted">Players</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-muted">Ticket</span>
                      <span className="font-semibold">${Number(d.ticketPrice).toFixed(2)}</span>
                    </div>

                    {isOpen && (
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-muted">Closing in</span>
                        <Countdown to={d.closeTime} />
                      </div>
                    )}

                    <Link
                      href={`/draws/${d.id}`}
                      className="btn btn-primary mt-6 w-full"
                    >
                      {isOpen ? 'Buy tickets' : 'View draw'}
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="relative px-4 py-16">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Recent draws & winners</h2>
                <p className="mt-2 text-muted">The latest payouts, fully public.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/history" className="btn btn-ghost">
                  Full history →
                </Link>
                <Link href="/winners" className="btn btn-ghost">
                  All winners →
                </Link>
              </div>
            </div>

            <div
              className="relative mt-8"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div className="overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                  {slides[slide] && (
                    <motion.div
                      key={slides[slide].id}
                      initial={{ opacity: 0, x: 60 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -60 }}
                      transition={{ duration: 0.5, ease }}
                      className="card relative overflow-hidden p-6 sm:p-8"
                    >
                      <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-accent/12 blur-[70px]" />
                      <div className="relative z-10">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="break-words text-xl font-semibold">{slides[slide].title}</h3>
                            <span className="text-sm text-muted">
                              {new Date(slides[slide].date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="stat-value text-2xl font-bold text-accent">
                              ${slides[slide].total.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted">awarded</div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                          {slides[slide].top.map((w) => (
                            <div
                              key={w.place}
                              className="rounded-xl border border-border bg-surface/70 px-4 py-3"
                            >
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                                  {w.place}
                                  {w.place === 1 ? 'st' : w.place === 2 ? 'nd' : w.place === 3 ? 'rd' : 'th'}
                                </span>
                                <span className="text-sm font-semibold text-accent">
                                  ${w.amount.toFixed(2)}
                                </span>
                              </div>
                              <div className="mt-2 truncate text-sm font-medium">{w.displayName}</div>
                              <div className="truncate font-mono text-[11px] text-muted">{w.wallet}</div>
                            </div>
                          ))}
                        </div>

                        <Link
                          href={`/winners/${slides[slide].id}`}
                          className="mt-5 inline-block text-sm text-accent hover:underline"
                        >
                          Winner page →
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Previous draw"
                    className="absolute top-1/2 -left-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/80 text-lg backdrop-blur transition-colors hover:border-accent/50 hover:text-accent sm:-left-4"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Next draw"
                    className="absolute top-1/2 -right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/80 text-lg backdrop-blur transition-colors hover:border-accent/50 hover:text-accent sm:-right-4"
                  >
                    ›
                  </button>

                  <div className="mt-6 flex items-center justify-center gap-2">
                    {slides.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSlide(i)}
                        aria-label={`Go to draw ${i + 1}`}
                        className={`h-2 rounded-full transition-all ${
                          i === slide ? 'w-6 bg-accent' : 'w-2 bg-border hover:bg-accent/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="relative px-4 py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What players say</h2>
            <p className="mt-3 text-muted">Real feedback from the community.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.05, ease }}
                className="card p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-[#1a1400]">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-muted">{t.role}</div>
                  </div>
                </div>
                <p className="mt-4 leading-relaxed text-muted">“{t.quote}”</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-16">
        <div className="container-page">
          <div className="grid gap-5 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
                className="flex gap-3 rounded-2xl border border-border bg-surface/70 p-5"
              >
                <span className="text-xl">{f.icon}</span>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="mt-14 overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/14 via-surface to-surface p-8 text-center sm:p-12"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Your ticket could be <span className="gradient-text">next</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Join the draw in under a minute. Connect your wallet, pick USDC or USDT, and send your entry.
            </p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href={href} className="btn btn-primary w-full sm:w-auto">
                Enter now
              </Link>
              <Link href="/draws" className="btn btn-ghost w-full sm:w-auto">
                All draws
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
