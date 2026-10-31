'use client'

import { useEffect, useState } from 'react'

export default function LotteryTimer({ closeTime, onEnd }: { closeTime: string | Date; onEnd?: () => void }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, ended: false })
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    const end = new Date(closeTime).getTime()
    const tick = () => {
      const now = Date.now()
      const diff = end - now
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0, ended: true })
        setShowPopup(true)
        if (onEnd) onEnd()
        return
      }
      if (diff < 300000 && !showPopup) setShowPopup(true)
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ h, m, s, ended: false })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [closeTime])

  return (
    <>
      <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${timeLeft.ended ? 'border-red-500/50 text-red-400' : timeLeft.h === 0 && timeLeft.m < 5 ? 'border-accent/70 text-accent animate-pulse shadow-[0_0_40px_rgba(245,197,66,0.3)]' : 'border-accent/40 text-accent'}`}>
        <span className="uppercase tracking-[0.3em] text-xs">Ends In</span>
        <span className="font-mono text-lg font-bold">{String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}:{String(timeLeft.s).padStart(2,'0')}</span>
      </div>
      {showPopup && !timeLeft.ended && (
        <div className="fixed inset-x-4 bottom-6 z-[80] mx-auto max-w-md">
          <div className="rounded-2xl border border-accent/60 bg-black/90 p-4 text-center shadow-[0_0_80px_rgba(245,197,66,0.4)] animate-bounce">
            <p className="text-lg font-black text-accent">⚡ ABOUT TO END!</p>
            <p className="mt-1 text-sm text-muted">Draw closing in {timeLeft.m}m {timeLeft.s}s</p>
          </div>
        </div>
      )}
      {timeLeft.ended && showPopup && (
        <div className="fixed inset-x-4 bottom-6 z-[80] mx-auto max-w-md">
          <div className="rounded-2xl border border-red-500/60 bg-black/90 p-4 text-center shadow-[0_0_80px_rgba(248,113,113,0.4)]">
            <p className="text-lg font-black text-red-400">DRAW CLOSED</p>
            <p className="mt-1 text-sm text-muted">Results will be announced soon</p>
          </div>
        </div>
      )}
    </>
  )
}
