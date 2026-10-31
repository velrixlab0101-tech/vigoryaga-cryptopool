import SlotMachine from '@/components/slot-machine/SlotMachine'
import Link from 'next/link'

export default function SlotsPage() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-4 pt-10 pb-16 sm:pt-14">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.22),transparent_70%)]" />
          <div className="grid-overlay" />
        </div>
        <div className="container-page mb-10">
          <Link href="/lotteries" className="text-sm text-muted hover:text-accent">← Back to Lottery Hub</Link>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="chip mb-3">New Game</div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Neon Jackpot <span className="gradient-text">Slots</span></h1>
              <p className="mt-2 text-muted">High-energy animated slot machine with cinematic lights, reels & big wins.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-accent/40 px-4 py-2 text-sm">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span><span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span></span>
              LIVE JACKPOT GROWING
            </div>
          </div>
        </div>
        <SlotMachine />
      </section>
    </main>
  )
}
