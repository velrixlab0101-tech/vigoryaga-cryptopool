'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

function diff(target: number) {
  const ms = Math.max(0, target - Date.now())
  const totalSeconds = Math.floor(ms / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: ms <= 0,
  }
}

export function Countdown({ to, className = '' }: { to: string | Date; className?: string }) {
  const target = new Date(to).getTime()
  const [t, setT] = useState(() => diff(target))

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (t.done) {
    return <span className={`text-foreground/60 ${className}`}>Closed</span>
  }

  const units = [
    { label: 'd', value: t.days },
    { label: 'h', value: t.hours },
    { label: 'm', value: t.minutes },
    { label: 's', value: t.seconds },
  ]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {units.map((u) => (
        <div key={u.label} className="flex items-baseline gap-0.5">
          <motion.span
            key={u.value}
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-accent font-bold tabular-nums"
          >
            {String(u.value).padStart(2, '0')}
          </motion.span>
          <span className="text-xs text-foreground/50">{u.label}</span>
        </div>
      ))}
    </div>
  )
}
