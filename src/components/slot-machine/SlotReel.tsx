'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const SYMBOLS = ['🍒','🍋','🍊','🍇','💎','7️⃣','⭐','🎰','💰','🔔']
const ITEM_H = 88

export default function SlotReel({ spinning, targetIndex, delay = 0 }: { spinning: boolean; targetIndex: number; delay?: number }) {
  const [translateY, setTranslateY] = useState(0)
  const [transition, setTransition] = useState('none')
  const [blur, setBlur] = useState(0)
  const [glow, setGlow] = useState(false)

  const strip = useMemo(() => {
    const items: string[] = []
    for (let r = 0; r < 16; r++) {
      for (let i = 0; i < SYMBOLS.length; i++) items.push(SYMBOLS[i])
    }
    return items
  }, [])

  useEffect(() => {
    const idx = ((targetIndex % SYMBOLS.length) + SYMBOLS.length) % SYMBOLS.length
    if (!spinning) {
      setTransition('none')
      setBlur(0)
      setGlow(false)
      setTranslateY(-(idx * ITEM_H))
      return
    }
    setTransition('none')
    setBlur(12)
    setGlow(false)
    setTranslateY(-(Math.floor(Math.random() * SYMBOLS.length) * ITEM_H))
    const t1 = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setBlur(6)
          setTransition('transform 1800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)')
          const extra = SYMBOLS.length * 8
          setTranslateY(-((extra + idx) * ITEM_H))
        })
      })
    }, delay)
    const t2 = setTimeout(() => {
      setBlur(2)
    }, delay + 1400)
    const t3 = setTimeout(() => {
      setBlur(0)
      setGlow(true)
      setTimeout(() => setGlow(false), 600)
    }, delay + 1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [spinning, targetIndex, delay])

  return (
    <div className={`relative h-[88px] w-[88px] overflow-hidden rounded-xl border transition-all duration-300 sm:h-[100px] sm:w-[100px] ${glow ? 'border-accent shadow-[0_0_60px_rgba(245,197,66,0.6)]' : 'border-accent/40 shadow-[inset_0_12px_60px_rgba(245,197,66,0.12),0_0_40px_rgba(245,197,66,0.08)]'}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/95 to-transparent z-30" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/95 to-transparent z-30" />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-accent shadow-[0_0_50px_rgba(245,197,66,1)] z-30" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-accent/30 rounded-xl z-30" />
      <div
        className="flex flex-col will-change-transform"
        style={{ transform: `translateY(${translateY}px)`, transition, filter: blur ? `blur(${blur}px)` : 'none' }}
      >
        {strip.map((s, i) => (
          <div key={i} className="flex h-[88px] w-[88px] items-center justify-center text-5xl sm:h-[100px] sm:w-[100px] sm:text-6xl">
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}
