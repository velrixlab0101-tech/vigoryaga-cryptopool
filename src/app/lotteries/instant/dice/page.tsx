'use client'

function rollDice(){ return Math.floor(Math.random()*100)+1 }

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
const ConnectButton = dynamic(() => import('@rainbow-me/rainbowkit').then(m=>m.ConnectButton), { ssr: false })
import ConfettiBurst from '@/components/instant-games/ConfettiBurst'

export default function DicePage() {
  let address: string | undefined
  try { address = useAccount().address } catch { address = undefined }
  const [bet, setBet] = useState(10)
  const [target, setTarget] = useState(50)
  const [mode, setMode] = useState<'under'|'over'>('under')
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState<number|null>(null)
  const [won, setWon] = useState(false)
  const [balance, setBalance] = useState(0)
  const [creditBalance, setCreditBalance] = useState(0)
  const [history, setHistory] = useState<Array<{r:number;w:boolean;p:number}>>([])
  const [confetti, setConfetti] = useState(false)
  const [bigConfetti, setBigConfetti] = useState(false)

  useEffect(() => {
    if (!address) { setBalance(0); setCreditBalance(0); return }
    fetch(`/api/credits?wallet=${address}`).then(r=>r.json()).then(d=>{
      const bal = Number(d.balance||0)
      setCreditBalance(bal)
      setBalance(bal)
    }).catch(()=>{})
  }, [address])
  const chance = mode === 'under' ? target : 100 - target
  const mult = Math.max(1.01, (99 / Math.max(1,chance)) * 0.99)
  const payout = bet * mult
  const roll = () => {
    if (rolling || balance < bet) return
    setRolling(true)
    setResult(null)
    setConfetti(false)
    setBalance(b => b - bet)
    setTimeout(() => {
      const r = rollDice()
      setResult(r)
      const win = mode === 'under' ? r < target : r > target
      setWon(win)
      if (win) {
        setBalance(b => b + payout)
        if (mult >= 10) { setBigConfetti(true); setTimeout(()=>setBigConfetti(false), 1500) }
        else { setConfetti(true); setTimeout(()=>setConfetti(false), 1200) }
      }
      setHistory(h => [{r, w: win, p: win ? payout : 0}, ...h].slice(0,10))
      setRolling(false)
    }, 900)
  }
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-3 pt-8 pb-12 sm:px-4 sm:pt-10 sm:pb-16">
        <div className="absolute inset-0 -z-10"><div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.2),transparent_70%)]" /><div className="grid-overlay" /></div>
        <div className="container-page">
          <Link href="/lotteries" className="text-sm text-muted hover:text-accent">← Back to Lottery Hub</Link>
          <div className="mt-4 mb-10 flex flex-wrap items-center justify-between gap-4">
            <div><div className="chip mb-3">Crypto Credits</div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Neon <span className="gradient-text">Dice</span></h1><p className="mt-2 text-muted">Roll under or over. Real crypto credit play.</p></div>
            <div className="flex items-center gap-3">
              {address ? <div className="rounded-full border border-accent/40 px-5 py-2 text-sm">Crypto Credits: <span className="text-accent">${balance.toFixed(2)}</span></div> : <ConnectButton />}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
            <div className="card relative overflow-hidden p-6 sm:p-10">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
              <div className="flex items-center justify-center">
                <div className={`relative flex h-44 w-44 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/40 to-accent-2/40 shadow-[0_0_150px_rgba(245,197,66,0.3)] transition-all ${rolling ? 'scale-110' : won && result!==null && !rolling ? 'scale-105 shadow-[0_0_180px_rgba(245,197,66,0.6)]' : ''}`} style={{ perspective: '800px' }}>
                  <div className={`relative h-32 w-32 transition-transform duration-[900ms] ${rolling ? 'animate-[spin_0.9s_ease-in-out_infinite]' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
                    <svg width="128" height="128" viewBox="0 0 128 128" className="absolute inset-0"><defs><linearGradient id="d" x1="0" y1="0" x2="128" y2="128"><stop stopColor="#f5c542"/><stop offset="1" stopColor="#ff8a3d"/></linearGradient></defs><rect x="14" y="14" width="100" height="100" rx="16" fill="url(#d)"/></svg>
                  </div>
                  {rolling && <div className="absolute text-5xl font-black text-black/80 animate-pulse">?</div>}
                  {result !== null && !rolling && <div className={`absolute text-5xl font-black text-black drop-shadow-[0_0_40px_rgba(255,255,255,0.8)] ${won ? 'scale-110' : ''} transition-transform`}>{result}</div>}
                </div>
              </div>
              <div className="mt-10">
                <div className="mb-3 flex justify-between text-sm"><span className="text-muted">ROLL {mode==='under'?'UNDER':'OVER'}</span><span className="text-accent font-semibold">{mode==='under'?`< ${target}`:`> ${target}`}</span></div>
                <input type="range" min={2} max={98} value={target} onChange={e=>setTarget(Number(e.target.value))} className="w-full accent-[#f5c542]" />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button onClick={()=>setMode('under')} className={`rounded-xl py-3 font-semibold ${mode==='under'?'bg-accent text-black':'border border-accent/40 text-accent'}`}>Roll Under</button>
                  <button onClick={()=>setMode('over')} className={`rounded-xl py-3 font-semibold ${mode==='over'?'bg-accent text-black':'border border-accent/40 text-accent'}`}>Roll Over</button>
                </div>
                <button onClick={roll} disabled={rolling || balance < bet} className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 py-4 text-lg font-black text-black shadow-[0_0_80px_rgba(245,197,66,0.4)] disabled:opacity-40">{rolling?'ROLLING...':'ROLL DICE'}</button>
                {result !== null && !rolling && <p className={`mt-4 text-center text-xl font-black ${won?'text-accent animate-pulse':'text-muted'}`}>{won?`🎉 YOU WIN $${payout.toFixed(2)} 🎉`:`YOU LOSE • Rolled ${result}`}</p>}
                <ConfettiBurst active={confetti} />
                <ConfettiBurst active={bigConfetti} big />
              </div>
            </div>
            <div className="space-y-4">
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Bet Amount</p>
                <div className="mt-3 flex items-center gap-2">
                  {[5,10,25,50,100].map(v=><button key={v} onClick={()=>setBet(v)} className={`flex-1 rounded-lg py-2 ${bet===v?'bg-accent text-black':'border border-accent/30 text-accent'}`}>${v}</button>)}
                </div>
              </div>
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Stats</p>
                <div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted">Win Chance</span><span>{chance.toFixed(1)}%</span></div><div className="flex justify-between"><span className="text-muted">Multiplier</span><span className="text-accent">{mult.toFixed(3)}x</span></div><div className="flex justify-between"><span className="text-muted">Payout on Win</span><span>${payout.toFixed(2)}</span></div></div>
              </div>
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Recent Rolls</p>
                <div className="mt-3 flex flex-wrap gap-2">{history.length===0?<span className="text-sm text-muted">No rolls yet</span>:history.map((h,i)=><span key={i} className={`rounded-full px-3 py-1 text-sm ${h.w?'border border-accent/40 text-accent':'border border-border text-muted'}`}>{h.r} {h.w?`+$${h.p.toFixed(0)}`:'-'}</span>)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )


}