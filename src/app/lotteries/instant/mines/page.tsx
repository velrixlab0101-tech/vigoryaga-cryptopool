'use client'

function shuffle(n:number){ const a=[...Array(n).keys()]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a }

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
const ConnectButton = dynamic(() => import('@rainbow-me/rainbowkit').then(m=>m.ConnectButton), { ssr: false })
import ConfettiBurst from '@/components/instant-games/ConfettiBurst'
import WinPopup from '@/components/instant-games/WinPopup'
export default function MinesPage() {
  const [bet, setBet] = useState(10)
  const [minesCount, setMinesCount] = useState(3)
  const [bombs, setBombs] = useState<Set<number>>(new Set())
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [playing, setPlaying] = useState(false)
  const [cashout, setCashout] = useState(0)
  let address: string | undefined
  try { address = useAccount().address } catch { address = undefined }
  const [balance, setBalance] = useState(0)
  const [creditBalance, setCreditBalance] = useState(0)

  useEffect(() => {
    if (!address) { setBalance(0); setCreditBalance(0); return }
    fetch(`/api/credits?wallet=${address}`).then(r=>r.json()).then(d=>{
      const bal = Number(d.balance||0)
      setCreditBalance(bal)
      setBalance(bal)
    }).catch(()=>{})
  }, [address])
  const [mult, setMult] = useState(1)
  const [shake, setShake] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [bigConfetti, setBigConfetti] = useState(false)
  const start = () => {
    if (balance < bet) return
    setBalance(b => b-bet)
    setBombs(new Set(shuffle(25).slice(0,minesCount)))
    setRevealed(new Set())
    setPlaying(true)
    setCashout(0)
    setMult(1)
  }
  const pick = (i:number) => {
    if (!playing || revealed.has(i)) return
    if (bombs.has(i)) {
      setRevealed(new Set(Array.from(bombs)))
      setPlaying(false)
      setShake(true)
      setTimeout(()=>setShake(false), 500)
      return
    }
    const nr = new Set(revealed); nr.add(i); setRevealed(nr)
    const safe = nr.size
    const m = Math.pow(25/(25-minesCount), safe) * 0.99
    setMult(m)
    setCashout(bet * m)
  }
  const cash = () => {
    if (!playing || revealed.size===0) return
    setBalance(b => b + cashout)
    if (mult >= 10) { setBigConfetti(true); setTimeout(()=>setBigConfetti(false), 2000) }
    else if (mult >= 3) { setConfetti(true); setTimeout(()=>setConfetti(false), 1400) }
    setPlaying(false)
  }
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-3 pt-8 pb-12 sm:px-4 sm:pt-10 sm:pb-16">
        <div className="absolute inset-0 -z-10"><div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.2),transparent_70%)]" /><div className="grid-overlay" /></div>
        <div className="container-page">
          <Link href="/lotteries" className="text-sm text-muted hover:text-accent">← Back to Lottery Hub</Link>
          <div className="mt-4 mb-10 flex flex-wrap items-center justify-between gap-4">
            <div><div className="chip mb-3">Crypto Credits</div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Neon <span className="gradient-text">Mines</span></h1><p className="mt-2 text-muted">Find gems, avoid mines. Cash out anytime.</p></div>
            <div className="rounded-full border border-accent/40 px-5 py-2 text-sm">Crypto Credits: <span className="text-accent">${balance.toFixed(2)}</span></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
            <div className="space-y-4">
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Bet Amount</p>
                <div className="mt-3 flex flex-wrap gap-2">{[5,10,25,50,100].map(v=><button key={v} onClick={()=>setBet(v)} disabled={playing} className={`rounded-lg px-4 py-2 ${bet===v?'bg-accent text-black':'border border-accent/30 text-accent'}`}>${v}</button>)}</div>
              </div>
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Mines</p>
                <input type="range" min={1} max={24} value={minesCount} onChange={e=>setMinesCount(Number(e.target.value))} disabled={playing} className="mt-3 w-full accent-[#f5c542]" />
                <p className="mt-2 text-center text-accent font-semibold">{minesCount} Mines</p>
              </div>
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Next / Cashout</p>
                <div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted">Multiplier</span><span className="text-accent">{mult.toFixed(3)}x</span></div><div className="flex justify-between"><span className="text-muted">Profit</span><span>${cashout.toFixed(2)}</span></div></div>
                {!playing ? <button onClick={start} disabled={balance<bet} className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 py-3 font-black text-black disabled:opacity-40">START GAME</button> : <button onClick={cash} disabled={revealed.size===0} className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 py-3 font-black text-black disabled:opacity-40">CASH OUT ${cashout.toFixed(2)}</button>}
              </div>
            </div>
            <div className={`card relative overflow-hidden p-4 sm:p-6 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {Array(25).fill(0).map((_,i)=>{
                  const rev = revealed.has(i)
                  const isBomb = bombs.has(i)
                  return <button key={i} onClick={()=>pick(i)} disabled={!playing || rev} className={`group relative aspect-square rounded-xl transition-all duration-500 [transform-style:preserve-3d] ${rev ? '[transform:rotateY(180deg)]' : 'hover:scale-105 hover:border-accent/60'}`}>
                    <div className={`absolute inset-0 rounded-xl [backface-visibility:hidden] ${rev ? '' : 'bg-gradient-to-br from-surface-2 to-surface border border-accent/20'}`} />
                    <div className={`absolute inset-0 flex items-center justify-center rounded-xl [backface-visibility:hidden] [transform:rotateY(180deg)] ${rev ? isBomb ? 'bg-gradient-to-br from-red-500/90 to-red-600/90 shadow-[0_0_50px_rgba(248,113,113,0.7)]' : 'bg-gradient-to-br from-accent/90 to-accent-2/90 shadow-[0_0_50px_rgba(245,197,66,0.6)]' : ''}`}>
                      {rev && <span className="text-2xl sm:text-3xl animate-bounce">{isBomb?'💣':'💎'}</span>}
                    </div>
                  </button>
                })}
              </div>
              {cashout > 0 && playing && <div className="mt-4 text-center text-lg font-black text-accent animate-pulse">PROFIT ${cashout.toFixed(2)} • {mult.toFixed(2)}x</div>}
              <ConfettiBurst active={confetti} />
              <ConfettiBurst active={bigConfetti} big />
            </div>
          </div>
        </div>
      </section>
    </main>
  )


}