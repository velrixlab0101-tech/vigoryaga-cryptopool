import Link from 'next/link'

const LOTTERIES = [
  { slug: 'classic', name: 'Classic Raffle', icon: '🎟️', desc: '5 winners split the prize pool', tag: 'Original' },
  { slug: 'fifty-fifty', name: '50/50 Draw', icon: '🎯', desc: 'One lucky player takes 50%', tag: 'Popular' },
  { slug: 'hourly', name: 'Hourly Blitz', icon: '⚡', desc: 'New draw every hour', tag: 'Fast' },
  { slug: 'daily', name: 'Daily Jackpot', icon: '🌟', desc: 'Massive daily prize pool', tag: 'Hot' },
  { slug: 'number-match', name: 'Lotto Number Match', icon: '🎱', desc: 'Pick 6 from 49 • Match to win', tag: 'Lotto' },
  { slug: 'keno', name: 'Keno', icon: '🎲', desc: 'Pick 1-10 • 20 drawn from 80', tag: 'Arcade' },
  { slug: 'rollover', name: 'Jackpot Rollover', icon: '💎', desc: 'Jackpot grows until won', tag: 'Mega' },
]

export default function LotteriesPage() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-4 pt-16 pb-14 sm:pt-24 sm:pb-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.24),transparent_72%)]" />
          <div className="grid-overlay opacity-60" />
          <div className="absolute -left-40 top-20 h-72 w-72 rounded-full bg-accent/10 blur-[120px]" />
          <div className="absolute -right-40 top-40 h-72 w-72 rounded-full bg-accent-2/10 blur-[120px]" />
        </div>
        <div className="container-page text-center">
          <div className="chip mx-auto mb-6 w-fit border-accent/40 bg-accent/10">CryptoPool Lottery Hub</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Play. Win. <span className="gradient-text">Repeat.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
            Provably fair lotteries & instant games on BNB Smart Chain. Fast rounds, stunning animations, real crypto rewards.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="#instant" className="btn btn-primary px-8 py-3 text-base shadow-[0_0_80px_rgba(245,197,66,0.35)]">Play Instant Games</Link>
            <Link href="#lotteries" className="btn btn-ghost px-8 py-3 text-base">Browse Lotteries</Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12">
        <div className="container-page">
          <Link
            href="/lotteries/slots"
            className="card card-hover group relative overflow-hidden p-6 sm:p-10"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
            <div className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-accent to-accent-2 px-3 py-1 text-xs font-black text-black shadow-[0_0_60px_rgba(245,197,66,0.5)]">FEATURED</div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/40 to-accent-2/40 text-5xl shadow-[0_0_80px_rgba(245,197,66,0.3)]">
                  <span className="relative z-10">🎰</span>
                  <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle,rgba(245,197,66,0.25),transparent)]" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Neon Jackpot <span className="gradient-text">Slots</span></h2>
                  <p className="mt-2 max-w-xl text-lg text-muted">Cinematic reels, motion blur, elastic stops, jackpot ticker & explosive win animations.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-accent/40 px-3 py-1 text-xs text-accent">3 Reels</span>
                    <span className="rounded-full border border-accent/40 px-3 py-1 text-xs text-accent">Jackpot</span>
                    <span className="rounded-full border border-accent/40 px-3 py-1 text-xs text-accent">Big Wins</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-lg font-semibold text-accent transition-transform group-hover:translate-x-2">
                Spin Now <span className="text-2xl">→</span>
              </div>
            </div>
            <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-accent/12 blur-[140px]" />
          </Link>
        </div>
      </section>

      <section id="instant" className="px-4 pb-16">
        <div className="container-page">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="chip mb-3">Play To Win</div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Instant Games</h2>
              <p className="mt-2 text-muted">Stake-style action. Lightning fast rounds with massive multipliers.</p>
            </div>
            <span className="text-sm text-muted">Crypto Credits • Animated • Mobile Optimized</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Link href="/lotteries/instant/dice" className="card card-hover group relative overflow-hidden p-5">
              <div className="absolute right-3 top-3 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent">Hot</div>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent-2/30 text-3xl shadow-[0_0_60px_rgba(245,197,66,0.2)]">🎲</div>
              <h3 className="text-lg font-bold">Neon Dice</h3>
              <p className="mt-1 text-sm text-muted">Roll under/over • Up to 99x</p>
              <div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted">Instant</span><span className="text-accent transition-transform group-hover:translate-x-1">Play →</span></div>
              <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-accent/10 blur-3xl" />
            </Link>
            <Link href="/lotteries/instant/plinko" className="card card-hover group relative overflow-hidden p-5">
              <div className="absolute right-3 top-3 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent">Trending</div>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent-2/30 text-3xl shadow-[0_0_60px_rgba(245,197,66,0.2)]">🔮</div>
              <h3 className="text-lg font-bold">Neon Plinko</h3>
              <p className="mt-1 text-sm text-muted">Bounce to multipliers • 50x max</p>
              <div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted">Physics Based</span><span className="text-accent transition-transform group-hover:translate-x-1">Play →</span></div>
              <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-accent/10 blur-3xl" />
            </Link>
            <Link href="/lotteries/instant/mines" className="card card-hover group relative overflow-hidden p-5">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent-2/30 text-3xl shadow-[0_0_60px_rgba(245,197,66,0.2)]">💎</div>
              <h3 className="text-lg font-bold">Neon Mines</h3>
              <p className="mt-1 text-sm text-muted">Find gems • Cash out anytime</p>
              <div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted">Strategy</span><span className="text-accent transition-transform group-hover:translate-x-1">Play →</span></div>
              <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-accent/10 blur-3xl" />
            </Link>
            <Link href="/lotteries/instant/wheel" className="card card-hover group relative overflow-hidden p-5">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent-2/30 text-3xl shadow-[0_0_60px_rgba(245,197,66,0.2)]">🎡</div>
              <h3 className="text-lg font-bold">Fortune Wheel</h3>
              <p className="mt-1 text-sm text-muted">Spin for glory • 50x max</p>
              <div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted">Classic</span><span className="text-accent transition-transform group-hover:translate-x-1">Play →</span></div>
              <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-accent/10 blur-3xl" />
            </Link>
            <Link href="/lotteries/instant/crash" className="card card-hover group relative overflow-hidden p-5">
              <div className="absolute right-3 top-3 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent">Addictive</div>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent-2/30 text-3xl shadow-[0_0_60px_rgba(245,197,66,0.2)]">🚀</div>
              <h3 className="text-lg font-bold">Neon Crash</h3>
              <p className="mt-1 text-sm text-muted">Cash out before crash</p>
              <div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted">Multiplier Rush</span><span className="text-accent transition-transform group-hover:translate-x-1">Play →</span></div>
              <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-accent/10 blur-3xl" />
            </Link>
          </div>
        </div>
      </section>

      <section id="lotteries" className="px-4 pb-24">
        <div className="container-page">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="chip mb-3">Raffle Lotteries</div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Lottery Draws</h2>
              <p className="mt-2 text-muted">Choose your format. Transparent draws with verifiable winners.</p>
            </div>
            <Link href="/draws" className="text-sm text-accent hover:underline">View Classic Draws →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LOTTERIES.map((lottery) => (
              <Link
                key={lottery.slug}
                href={`/lotteries/${lottery.slug}`}
                className="card card-hover group relative overflow-hidden p-6"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
                <div className="absolute right-4 top-4 rounded-full border border-accent/40 px-2.5 py-1 text-xs text-accent">
                  {lottery.tag}
                </div>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/25 to-accent-2/25 text-4xl shadow-[0_0_60px_rgba(245,197,66,0.18)]">
                  {lottery.icon}
                </div>
                <h3 className="text-xl font-bold">{lottery.name}</h3>
                <p className="mt-2 text-muted">{lottery.desc}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-muted">View active rounds</span>
                  <span className="text-accent transition-transform group-hover:translate-x-1">→</span>
                </div>
                <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-accent/8 blur-3xl transition-opacity group-hover:opacity-90" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
