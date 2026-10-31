'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
const ConnectButton = dynamic(() => import('@rainbow-me/rainbowkit').then(m=>m.ConnectButton), { ssr: false })
import ConfettiBurst from '@/components/instant-games/ConfettiBurst'
import WinPopup from '@/components/instant-games/WinPopup'

const SEGMENTS = [
  { m: 1.5, c: '#f5c542' }, { m: 2, c: '#ff8a3d' }, { m: 1, c: '#f5c542' }, { m: 3, c: '#ffb84d' },
  { m: 1.5, c: '#ff8a3d' }, { m: 5, c: '#ffd86b' }, { m: 1, c: '#f5c542' }, { m: 10, c: '#ff9f1a' },
  { m: 2, c: '#ff8a3d' }, { m: 25, c: '#ffe08a' }, { m: 1.5, c: '#f5c542' }, { m: 50, c: '#fff3b0' },
]

export default function WheelPage() {
  const [bet, setBet] = useState(10)
  const [spinning, setSpinning] = useState(false)
  const [deg, setDeg] = useState(0)
  const [win, setWin] = useState<number|null>(null)
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
  const [confetti, setConfetti] = useState(false)
  const [bigConfetti, setBigConfetti] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)

  const spin = () => {
    if (spinning || balance < bet) return
    setSpinning(true)
    setWin(null)
    setConfetti(false)
    setBalance(b => b - bet)
    const idx = Math.floor(Math.random()*SEGMENTS.length)
    const segDeg = 360/SEGMENTS.length
    const target = 360 * 10 + (360 - idx*segDeg - segDeg/2)
    setDeg(target)
    setTimeout(() => {
      const m = SEGMENTS[idx].m
      const w = bet * m
      setWin(w)
      setBalance(b => b + w)
      if (m >= 25) { setBigConfetti(true); setTimeout(()=>setBigConfetti(false), 2000) }
      else if (m >= 5) { setConfetti(true); setTimeout(()=>setConfetti(false), 1400) }
      setSpinning(false)
    }, 5000)
  }

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-3 pt-8 pb-12 sm:px-4 sm:pt-10 sm:pb-16">
        <div className="absolute inset-0 -z-10"><div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.22),transparent_70%)]" /><div className="grid-overlay" /></div>
        <div className="container-page">
          <Link href="/lotteries" className="text-sm text-muted hover:text-accent">← Back to Lottery Hub</Link>
          <div className="mt-4 mb-10 flex flex-wrap items-center justify-between gap-4">
            <div><div className="chip mb-3">Crypto Credits</div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Fortune <span className="gradient-text">Wheel</span></h1><p className="mt-2 text-muted">Spin the wheel for multipliers up to 50x</p></div>
            <div className="rounded-full border border-accent/40 px-5 py-2 text-sm">Crypto Credits: <span className="text-accent">${balance.toFixed(2)}</span></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
            <div className="space-y-4">
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Bet Amount</p>
                <div className="mt-3 flex flex-wrap gap-2">{[5,10,25,50,100].map(v=><button key={v} onClick={()=>setBet(v)} disabled={spinning} className={`rounded-lg px-4 py-2 ${bet===v?'bg-accent text-black':'border border-accent/30 text-accent'}`}>${v}</button>)}</div>
              </div>
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Multipliers</p>
                <div className="mt-3 flex flex-wrap gap-2">{SEGMENTS.map((s,i)=><span key={i} className="rounded-full px-3 py-1 text-xs" style={{background:s.c+'33',color:s.c}}>{s.m}x</span>)}</div>
              </div>
              <button onClick={spin} disabled={spinning || balance<bet} className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 py-4 text-lg font-black text-black shadow-[0_0_80px_rgba(245,197,66,0.4)] disabled:opacity-40">{spinning?'SPINNING...':'SPIN WHEEL'}</button>
              {win!==null && !spinning && <p className="text-center text-lg font-bold text-accent">YOU WIN ${win.toFixed(2)}!</p>}
            </div>
            <div className="card relative overflow-hidden p-6 sm:p-10 flex items-center justify-center">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
              <svg width="28" height="44" className={`absolute top-4 z-30 drop-shadow-[0_0_40px_rgba(245,197,66,1)] transition-transform ${spinning?'scale-110':''}`}><polygon points="14,0 28,44 0,44" fill="#f5c542"/></svg>
              <div className="absolute h-[340px] w-[340px] sm:h-[440px] sm:w-[440px] rounded-full bg-gradient-to-r from-accent/15 to-accent-2/15 blur-3xl" />
              <div ref={wheelRef} className="relative h-[320px] w-[320px] sm:h-[420px] sm:w-[420px] rounded-full shadow-[0_0_160px_rgba(245,197,66,0.28)] ring-2 ring-accent/40" style={{transform:`rotate(${deg}deg)`, transition: spinning?'transform 5s cubic-bezier(0.12,0.7,0.08,1)':'none'}}>
                <svg viewBox="0 0 100 100" className="h-full w-full"><defs>{SEGMENTS.map((s,i)=><path key={i} id={`w${i}`} d={`M50,50 L50,0 A50,50 0 0,1 ${50+50*Math.sin(2*Math.PI/SEGMENTS.length)} ${50-50*Math.cos(2*Math.PI/SEGMENTS.length)} Z`} />)}</defs>{SEGMENTS.map((s,i)=>(<g key={i} transform={`rotate(${i*360/SEGMENTS.length} 50 50)`}><path d={`M50,50 L50,0 A50,50 0 0,1 ${50+50*Math.sin(2*Math.PI/SEGMENTS.length)} ${50-50*Math.cos(2*Math.PI/SEGMENTS.length)} Z`} fill={s.c} opacity=".95"/><text x="50" y="12" textAnchor="middle" fontSize="6" fill="#0b0b12" fontWeight="900" transform={`rotate(${-i*360/SEGMENTS.length} 50 12)`}>{s.m}x</text></g>))}<circle cx="50" cy="50" r="8" fill="url(#cg)"/><defs><radialGradient id="cg"><stop stopColor="#ffd86b"/><stop offset="1" stopColor="#f5c542"/></radialGradient></defs></svg>
              </div>
              {win!==null && !spinning && <div className="absolute z-40 rounded-full bg-gradient-to-r from-accent to-accent-2 px-8 py-3 text-xl font-black text-black shadow-[0_0_120px_rgba(245,197,66,0.95)] animate-pulse">WIN ${win.toFixed(2)}</div>}
              <ConfettiBurst active={confetti} />
              <ConfettiBurst active={bigConfetti} big />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}