'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import dynamic from 'next/dynamic'
import ConfettiBurst from '@/components/instant-games/ConfettiBurst'
import WinPopup from '@/components/instant-games/WinPopup'

const ConnectButton = dynamic(() => import('@rainbow-me/rainbowkit').then(m=>m.ConnectButton), { ssr: false })

export default function CrashPage() {
  let address: string | undefined
  try { address = useAccount().address } catch { address = undefined }
  const [bet, setBet] = useState(10)
  const [balance, setBalance] = useState(0)
  const [running, setRunning] = useState(false)
  const [mult, setMult] = useState(1.00)
  const [cashed, setCashed] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const [crashAt, setCrashAt] = useState(0)
  const [win, setWin] = useState(0)
  const [showWin, setShowWin] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [bigConfetti, setBigConfetti] = useState(false)
  const raf = useRef<number | null>(null)
  const startRef = useRef(0)

  useEffect(() => {
    if (!address) { setBalance(0); return }
    fetch(`/api/credits?wallet=${address}`).then(r=>r.json()).then(d=>{
      setBalance(Number(d.balance||0))
    }).catch(()=>{})
  }, [address])

  const start = () => {
    if (running || balance < bet || !address) return
    setBalance(b => b - bet)
    setRunning(true)
    setCashed(false)
    setMult(1.00)
    setShowWin(false)
    setConfetti(false)
    const ca = 1 + Math.pow(Math.random(), 1.8) * 9
    setCrashAt(ca)
    startRef.current = performance.now()
    const tick = (t:number) => {
      const el = (t - startRef.current)/1000
      const m = Math.pow(Math.E, 0.12 * el)
      setMult(m)
      if (m >= ca) {
        setRunning(false)
        setHistory(h => [Number(ca.toFixed(2)), ...h].slice(0,10))
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  const cash = () => {
    if (!running || cashed) return
    setCashed(true)
    const w = bet * mult
    setBalance(b => b + w)
    setWin(w)
    setShowWin(true)
    if (mult >= 10) { setBigConfetti(true); setTimeout(()=>setBigConfetti(false), 2000) }
    else if (mult >= 2) { setConfetti(true); setTimeout(()=>setConfetti(false), 1400) }
    setTimeout(()=>setShowWin(false), 2200)
  }

  useEffect(()=>()=>{ if(raf.current) cancelAnimationFrame(raf.current) },[])

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-3 pt-8 pb-12 sm:px-4 sm:pt-10 sm:pb-16">
        <div className="absolute inset-0 -z-10"><div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.22),transparent_70%)]" /><div className="grid-overlay" /></div>
        <div className="container-page">
          <Link href="/lotteries" className="text-sm text-muted hover:text-accent">← Back to Lottery Hub</Link>
          <div className="mt-4 mb-10 flex flex-wrap items-center justify-between gap-4">
            <div><div className="chip mb-3">Crypto Credits</div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Neon <span className="gradient-text">Crash</span></h1><p className="mt-2 text-muted">Cash out before it crashes. Crypto credit play.</p></div>
            <div>{address ? <div className="rounded-full border border-accent/40 px-5 py-2 text-sm">Crypto Credits: <span className="text-accent">${balance.toFixed(2)}</span></div> : <ConnectButton />}</div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
            <WinPopup show={showWin} amount={win} multiplier={mult} />
            <ConfettiBurst active={confetti} />
            <ConfettiBurst active={bigConfetti} big />
            <div className="space-y-4">
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Bet Amount</p>
                <div className="mt-3 flex flex-wrap gap-2">{[5,10,25,50,100].map(v=><button key={v} onClick={()=>setBet(v)} disabled={running} className={`rounded-lg px-4 py-2 ${bet===v?'bg-accent text-black':'border border-accent/30 text-accent'}`}>${v}</button>)}</div>
              </div>
              {!running ? <button onClick={start} disabled={balance<bet || !address} className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 py-4 text-lg font-black text-black shadow-[0_0_80px_rgba(245,197,66,0.4)] disabled:opacity-40">{address?'PLACE BET & GO':'CONNECT WALLET'}</button> : <button onClick={cash} disabled={cashed} className="w-full rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 py-4 text-lg font-black text-black shadow-[0_0_80px_rgba(52,211,153,0.4)] disabled:opacity-40">{cashed?`CASHED @ ${mult.toFixed(2)}x`:`CASH OUT • $${(bet*mult).toFixed(2)}`}</button>}
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Crash History</p>
                <div className="mt-3 flex flex-wrap gap-2">{history.map((h,i)=><span key={i} className={`rounded-full px-3 py-1 text-sm ${h>=2?'border border-accent/40 text-accent':'border border-border text-muted'}`}>{h.toFixed(2)}x</span>)}</div>
              </div>
            </div>
            <div className="card relative overflow-hidden p-6 sm:p-10 flex items-center justify-center min-h-[360px]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
              <svg className="absolute inset-0 h-full w-full opacity-30"><line x1="0" y1="80%" x2="100%" y2="80%" stroke="rgba(245,197,66,0.3)" strokeDasharray="4 6"/></svg>
              <div className="relative z-10 text-center">
                <div className={`text-7xl font-black sm:text-9xl ${!running && !cashed && mult>=crashAt && crashAt>1 ? 'text-red-400 scale-110' : 'gradient-text'}`}>{mult.toFixed(2)}x</div>
                <p className="mt-4 text-muted">{running ? 'RISING...' : cashed ? 'CASHED OUT' : crashAt>0 ? `CRASHED @ ${crashAt.toFixed(2)}x` : 'PLACE YOUR BET'}</p>
              </div>
              <svg className={`absolute bottom-12 left-12 h-14 w-14 transition-all duration-300 ${running?'translate-x-[35vw] -translate-y-[25vh] rotate-12':''}`} viewBox="0 0 64 64"><path d="M12 32 L52 12 L42 32 L52 52 Z" fill="#f5c542"/></svg>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
