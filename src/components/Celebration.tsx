'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface Piece {
  id: number
  x: number
  delay: number
  duration: number
  rotate: number
  color: string
}

const COLORS = ['#F5C542', '#f97316', '#22c55e', '#38bdf8', '#e879f9', '#facc15']

/**
 * Lightweight confetti burst built with framer-motion — no external asset or
 * Lottie file needed. Renders a fixed, pointer-events-none overlay.
 */
export function Celebration({ run, count = 40 }: { run: boolean; count?: number }) {
  const pieces = useMemo<Piece[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (i / count) * 100 + (i % 3) * 2,
      delay: (i % 10) * 0.05,
      duration: 1.4 + (i % 5) * 0.2,
      rotate: (i % 8) * 45,
      color: COLORS[i % COLORS.length],
    }))
  }, [count])

  if (!run) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ top: '-5%', left: `${p.x}%`, opacity: 1, rotate: 0 }}
          animate={{ top: '105%', opacity: [1, 1, 0.6, 0], rotate: p.rotate + 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          className="absolute block h-2.5 w-1.5 rounded-sm"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  )
}
