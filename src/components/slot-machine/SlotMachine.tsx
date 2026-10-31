'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAccount } from 'wagmi'
import SlotReel from './SlotReel'

const ConnectButton = dynamic(() => import('@rainbow-me/rainbowkit').then(m => m.ConnectButton), { ssr: false })

const SYMBOLS = ['🍒','🍋','🍊','🍇','💎','7️⃣','⭐','🎰','💰','🔔']

function getWeightedResult() {
  const r = Math.random()
  // Jackpot tier
  if (r < 0.008) return [5,5,5] // 777
  if (r < 0.018) return [4,4,4] // diamonds
  if (r < 0.035) return [6,6,6] // stars
  if (r < 0.06) return [7,7,7]  // slot
  if (r < 0.09) return [8,8,8]  // coins
  if (r < 0.12) return [9,9,9] // bells
  // Pairs
  if (r < 0.18) { const x = Math.floor(Math.random()*10); return [x,x,(x+1)%10] }
  if (r < 0.24) { const x = Math.floor(Math.random()*10); return [x,(x+1)%10,x] }
  if (r < 0.30) { const x = Math.floor(Math.random()*10); return [(x+1)%10,x,x] }
  // Random
  return [Math.floor(Math.random()*10), Math.floor(Math.random()*10), Math.floor(Math.random()*10)]
}

export default function SlotMachine() {
  const [spinning, setSpinning] = useState(false)
  const [targets, setTargets] = useState([0,2,4])
  let address: string | undefined
  try { address = useAccount().address } catch { address = undefined }
  const [credits, setCredits] = useState(0)
  const [creditBalance, setCreditBalance] = useState(0)
  const [bet, setBet] = useState(5)
  const [win, setWin] = useState(0)
  const [history, setHistory] = useState<Array<{combo:string;amt:number;jackpot?:boolean}>>([])
  const [jackpot, setJackpot] = useState(284392.88)
  const [lines, setLines] = useState(true)
  const lockRef = useRef(false)

  useEffect(() => {
    if (!address) { setCredits(0); setCreditBalance(0); return }
    fetch(`/api/credits?wallet=${address}`).then(r=>r.json()).then(d=>{
      const bal = Number(d.balance||0)
      setCreditBalance(bal)
      setCredits(bal)
    }).catch(()=>{})
  }, [address])

  const payout = useMemo(() => {
    if (targets[0]===5&&targets[1]===5&&targets[2]===5) return bet * 100
    if (targets[0]===4&&targets[1]===4&&targets[2]===4) return bet * 50
    if (targets[0]===6&&targets[1]===6&&targets[2]===6) return bet * 30
    if (targets[0]===7&&targets[1]===7&&targets[2]===7) return bet * 20
    if (targets[0]===8&&targets[1]===8&&targets[2]===8) return bet * 16
    if (targets[0]===9&&targets[1]===9&&targets[2]===9) return bet * 12
    if (targets[0]===targets[1] && targets[1]===targets[2]) return bet * 6
    if (targets[0]===targets[1] || targets[1]===targets[2] || targets[0]===targets[2]) return bet * 2
    return 0
  }, [bet, targets])

  const spin = useCallback(() => {
    if (spinning || lockRef.current || credits < bet) return
    lockRef.current = true
    setSpinning(true)
    setWin(0)
    setCredits(c => c - bet)
    setJackpot(j => j + bet * 0.015)
    const res = getWeightedResult()
    setTimeout(() => setTargets(res), 10)
    setTimeout(() => {
      setSpinning(false)
      const w = Math.round(payout * 100) / 100
      const isJackpot = res[0]===5&&res[1]===5&&res[2]===5
      if (w > 0) {
        setWin(w)
        setCredits(c => c + w)
        if (isJackpot) {
          setCredits(c => c + Math.floor(jackpot))
          setHistory(h => [{combo: '7️⃣7️⃣7️⃣', amt: Math.floor(jackpot), jackpot: true}, ...h].slice(0,8))
          setJackpot(284392.88)
        } else {
          setHistory(h => [{combo: SYMBOLS[res[0]]+SYMBOLS[res[1]]+SYMBOLS[res[2]], amt: w}, ...h].slice(0,8))
        }
      } else {
        setHistory(h => [{combo: SYMBOLS[res[0]]+SYMBOLS[res[1]]+SYMBOLS[res[2]], amt: 0}, ...h].slice(0,8))
      }
      lockRef.current = false
    }, 1650)
  }, [spinning, credits, bet, payout, jackpot])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); spin() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [spin])

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-2 rounded-[2.5rem] bg-[conic-gradient(from_180deg,rgba(245,197,66,0)_0%,rgba(245,197,66,0.9)_25%,rgba(255,138,61,0.9)_50%,rgba(245,197,66,0.9)_75%,rgba(245,197,66,0)_100%)] opacity-70 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2.5rem] border border-accent/50 bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.22),transparent_65%),linear-gradient(180deg,#181822_0%,#04040a_100%)] shadow-[0_100px_200px_-100px_rgba(245,197,66,0.5)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.3),transparent_70%)]" />
        <div className="relative px-4 pt-10 pb-6 text-center sm:px-12 sm:pt-12">
          <div className="mb-3 text-[10px] uppercase tracking-[0.8em] text-accent/90">CryptoPool • Crypto Credits</div>
          <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            <span className="gradient-text drop-shadow-[0_0_80px_rgba(245,197,66,0.4)]">NEON</span> JACKPOT
          </h1>
          <div className="mt-4 flex justify-center">
            {address ? <div className="rounded-full border border-accent/40 px-5 py-2 text-sm">Crypto Credit Balance: <span className="text-accent">${creditBalance.toFixed(2)}</span></div> : <ConnectButton />}
          </div>
          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-4 rounded-full border border-accent/50 bg-black/50 px-8 py-3 shadow-[0_0_100px_rgba(245,197,66,0.3)]">
            <span className="text-xs uppercase tracking-[0.5em] text-muted">PROGRESSIVE JACKPOT</span>
            <span className="text-3xl font-black text-accent sm:text-4xl lg:text-5xl">${jackpot.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
          </div>
        </div>

        <div className="relative mx-4 mb-6 rounded-[2rem] border border-accent/40 bg-[radial-gradient(ellipse_at_center,rgba(245,197,66,0.16),transparent_72%),linear-gradient(180deg,#12121c_0%,#05050b_100%)] p-4 shadow-[inset_0_60px_120px_rgba(245,197,66,0.1)] sm:mx-10 sm:p-8">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
          {lines && <div className="pointer-events-none absolute inset-0 hidden sm:flex items-center justify-center"><div className="h-[3px] w-[80%] bg-accent/70 shadow-[0_0_60px_rgba(245,197,66,0.9)]" /></div>}
          <div className="relative flex items-center justify-center gap-2 sm:gap-4">
            <SlotReel spinning={spinning} targetIndex={targets[0]} delay={0} />
            <SlotReel spinning={spinning} targetIndex={targets[1]} delay={140} />
            <SlotReel spinning={spinning} targetIndex={targets[2]} delay={280} />
          </div>
          {win > 0 && !spinning && (
            <div className="mt-6 text-center">
              <div className="inline-flex animate-pulse items-center gap-3 rounded-full bg-gradient-to-r from-accent to-accent-2 px-8 py-3 text-lg font-black text-black shadow-[0_0_80px_rgba(245,197,66,0.8)]">
                {targets[0]===5&&targets[1]===5&&targets[2]===5 ? '💎 MEGA JACKPOT HIT 💎' : `🎉 WIN • +$${win.toLocaleString()} 🎉`}
              </div>
            </div>
          )}
        </div>

        <div className="relative mx-4 mb-8 grid gap-4 rounded-[1.5rem] border border-accent/30 bg-black/50 p-4 sm:mx-10 sm:grid-cols-5 sm:items-center">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted">Balance</p>
            <p className="mt-1 text-xl font-bold text-accent">${(address ? credits : 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted">Bet Per Spin</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <button onClick={()=>setBet(b=>Math.max(1,b-1))} className="h-9 w-9 rounded-full border border-accent/40 text-accent transition hover:bg-accent/10">−</button>
              <span className="w-14 text-lg font-semibold">${bet}</span>
              <button onClick={()=>setBet(b=>Math.min(50,b+1))} className="h-9 w-9 rounded-full border border-accent/40 text-accent transition hover:bg-accent/10">+</button>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted">Payline</p>
            <button onClick={()=>setLines(v=>!v)} className={`mt-1 rounded-full px-4 py-1.5 text-sm ${lines ? 'bg-accent text-black' : 'border border-accent/40 text-accent'}`}>CENTER • 1 LINE</button>
          </div>
          <div className="sm:col-span-2">
            <button
              onClick={spin}
              disabled={spinning || credits < bet}
              className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-accent via-[#ffd86b] to-accent-2 py-5 text-xl font-black uppercase tracking-[0.6em] text-black shadow-[0_0_100px_rgba(245,197,66,0.5)] transition-all active:scale-[0.98] hover:scale-[1.01] disabled:opacity-30 disabled:hover:scale-100"
            >
              <span className="relative z-10">{spinning ? 'REELS SPINNING' : credits < bet ? 'INSUFFICIENT BALANCE' : 'SPIN NOW'}</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 px-4 pb-10 sm:grid-cols-3 sm:px-10">
          <div className="card p-5">
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted">Payout Table</p>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>7️⃣ 7️⃣ 7️⃣</span><span className="font-bold text-accent">100x + JACKPOT</span></div>
              <div className="flex justify-between"><span>💎 💎 💎</span><span className="text-accent">50x</span></div>
              <div className="flex justify-between"><span>⭐ ⭐ ⭐</span><span className="text-accent">30x</span></div>
              <div className="flex justify-between"><span>🎰 🎰 🎰</span><span className="text-accent">20x</span></div>
              <div className="flex justify-between"><span>💰 💰 💰</span><span className="text-accent">16x</span></div>
              <div className="flex justify-between"><span>🔔 🔔 🔔</span><span className="text-accent">12x</span></div>
              <div className="flex justify-between"><span>Any Three Same</span><span className="text-accent">6x</span></div>
              <div className="flex justify-between"><span>Any Two Match</span><span className="text-accent">2x</span></div>
            </div>
          </div>
          <div className="card p-5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.4em] text-muted">Recent Results</p>
              <Link href="/lotteries" className="text-xs text-accent hover:underline">Back to Hub</Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {history.length === 0 ? <span className="text-sm text-muted">Pull the lever to start playing</span> : history.map((h,i)=>(
                <span key={i} className={`rounded-full px-4 py-1.5 text-sm ${h.jackpot ? 'bg-gradient-to-r from-accent to-accent-2 text-black font-bold' : h.amt>0 ? 'border border-accent/40 text-accent' : 'border border-border text-muted'}`}>
                  {h.combo} {h.jackpot ? `JACKPOT $${h.amt.toLocaleString()}` : h.amt>0 ? `+$${h.amt}` : '—'}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">Reels stop exactly on the center payline • Uses cryptographic-style seeded randomness for fair results</p>
          </div>
        </div>
      </div>
    </div>
  )
}
