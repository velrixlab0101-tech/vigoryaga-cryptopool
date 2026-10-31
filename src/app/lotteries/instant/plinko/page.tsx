'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
const ConnectButton = dynamic(() => import('@rainbow-me/rainbowkit').then(m=>m.ConnectButton), { ssr: false })
const MULTS = [0.5, 1, 2, 5, 10, 25, 50, 25, 10, 5, 2, 1, 0.5]
type Peg = { x: number; y: number }
export default function PlinkoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bet, setBet] = useState(10)
  const [risk, setRisk] = useState<'low'|'med'|'high'>('med')
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
  const [dropping, setDropping] = useState(false)
  const [last, setLast] = useState<number|null>(null)
  const [history, setHistory] = useState<Array<{m:number;w:number}>>([])

  const drop = () => {
    if (dropping || balance < bet) return
    setDropping(true)
    setBalance(b => b - bet)
    setTimeout(() => {
      let pos = 6.5
      for (let i = 0; i < 12; i++) {
        pos += Math.random() > 0.5 ? 0.5 + Math.random() * 0.4 : - (0.5 + Math.random() * 0.4)
        pos = Math.max(1, Math.min(12, pos))
      }
      const bin = Math.round(pos - 1)
      const idxBin = Math.max(0, Math.min(MULTS.length - 1, bin))
      const m = MULTS[idxBin] || 1
      const w = bet * m
      setLast(m)
      if (w > bet) setBalance(b => b + w)
      setHistory(h => [{m,w}, ...h].slice(0,12))
      setDropping(false)
    }, 1400)
  }

  useEffect(()=>{
    const c = canvasRef.current; if(!c) return
    const ctx = c.getContext('2d')!
    c.width=320; c.height=300
    ctx.clearRect(0,0,320,300)
    for(let row=0;row<12;row++){
      for(let col=0;col<=row;col++){
        const x = 160 - row*12 + col*24
        const y = 30 + row*20
        ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2)
        ctx.fillStyle='rgba(245,197,66,0.7)'
        ctx.shadowColor='rgba(245,197,66,0.5)'
        ctx.shadowBlur=6
        ctx.fill()
        ctx.shadowBlur=0
      }
    }
    MULTS.forEach((m,i)=>{
      const x=25+i*22
      const isBig = m>=10
      const isMed = m>=2 && m<10
      ctx.fillStyle = isBig?'rgba(245,197,66,0.95)':isMed?'rgba(255,184,77,0.8)':'rgba(100,110,140,0.6)'
      ctx.fillRect(x-10,270,20,26)
      ctx.fillStyle='#0b0b12'
      ctx.font='bold 8px sans-serif'
      ctx.textAlign='center'
      ctx.fillText(m+'x',x,286)
    })
  },[])

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-3 pt-8 pb-12 sm:px-4 sm:pt-10 sm:pb-16">
        <div className="absolute inset-0 -z-10"><div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.22),transparent_70%)]" /><div className="grid-overlay" /></div>
        <div className="container-page">
          <Link href="/lotteries" className="text-sm text-muted hover:text-accent">← Back to Lottery Hub</Link>
          <div className="mt-4 mb-10 flex flex-wrap items-center justify-between gap-4">
            <div><div className="chip mb-3">Crypto Credits</div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Neon <span className="gradient-text">Plinko</span></h1><p className="mt-2 text-muted">Drop the ball. Watch it bounce to big multipliers.</p></div>
            <div className="rounded-full border border-accent/40 px-5 py-2 text-sm">Crypto Credits: <span className="text-accent">${balance.toFixed(2)}</span></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
            <div className="space-y-4">
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Bet Amount</p>
                <div className="mt-3 flex flex-wrap gap-2">{[5,10,25,50,100].map(v=><button key={v} onClick={()=>setBet(v)} disabled={dropping} className={`rounded-lg px-4 py-2 ${bet===v?'bg-accent text-black':'border border-accent/30 text-accent'}`}>${v}</button>)}</div>
              </div>
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Risk</p>
                <div className="mt-3 grid grid-cols-3 gap-2">{(['low','med','high'] as const).map(r=><button key={r} onClick={()=>setRisk(r)} className={`rounded-lg py-2 uppercase text-xs ${risk===r?'bg-accent text-black':'border border-accent/30 text-accent'}`}>{r}</button>)}</div>
              </div>
              <button onClick={drop} disabled={dropping || balance<bet} className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 py-4 text-lg font-black text-black shadow-[0_0_80px_rgba(245,197,66,0.4)] disabled:opacity-40">{dropping?'DROPPING...':'DROP BALL'}</button>
              {last!==null && !dropping && <p className="text-center text-lg font-bold text-accent">Landed {last}x • Won ${(bet*last).toFixed(2)}</p>}
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Recent Drops</p>
                <div className="mt-3 flex flex-wrap gap-2">{history.length===0?<span className="text-sm text-muted">No drops yet</span>:history.map((h,i)=><span key={i} className={`rounded-full px-3 py-1 text-sm ${h.w>bet?'border border-accent/40 text-accent':'border border-border text-muted'}`}>{h.m}x {h.w>bet?`+$${(h.w-bet).toFixed(0)}`:''}</span>)}</div>
              </div>
            </div>
            <div className="card relative overflow-hidden p-4 sm:p-6 flex items-center justify-center">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
              <div className="relative h-[300px] w-[320px]">
                <div className={`absolute left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_60px_rgba(245,197,66,1)] transition-all ease-out ${dropping ? 'duration-[1400ms]' : 'duration-300'} ${dropping ? 'top-[265px]' : 'top-[4px]'}`} />
                <canvas ref={canvasRef} className="h-[300px] w-[320px]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}