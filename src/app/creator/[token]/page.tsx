'use client'

import { use, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface CreatorData {
  code: string
  displayName: string | null
  sharePct: number
  referredUsers: number
  referredVolume: number
  earned: number
  paidOut: number
  pending: number
}

export default function CreatorDashboard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<CreatorData | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading')
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    fetch(`/api/creator/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          setState('missing')
          return
        }
        const d = await r.json()
        setData(d)
        setState('ok')
      })
      .catch(() => setState('missing'))
  }, [token])

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground/70">
        Loading…
      </div>
    )
  }

  if (state === 'missing' || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-foreground/70">Not found.</p>
      </div>
    )
  }

  const link = `${origin}/draws?ref=${data.code}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const stats = [
    { label: 'Referred players', value: data.referredUsers.toLocaleString() },
    { label: 'Referred volume', value: `$${data.referredVolume.toFixed(2)}` },
    { label: 'Your share', value: `${data.sharePct}%` },
    { label: 'Earned', value: `$${data.earned.toFixed(2)}` },
    { label: 'Paid out', value: `$${data.paidOut.toFixed(2)}` },
    { label: 'Pending', value: `$${data.pending.toFixed(2)}` },
  ]

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-foreground/60">Creator dashboard</p>
          <h1 className="text-4xl font-bold mb-2">{data.displayName || 'Your stats'}</h1>
          <p className="text-foreground/70 mb-8">
            Share your link to earn {data.sharePct}% of every ticket bought through it.
          </p>
        </motion.div>

        <div className="bg-surface rounded-2xl border border-accent/20 p-6 mb-6">
          <p className="text-sm text-foreground/60 mb-2">Your creator code</p>
          <div className="text-3xl font-bold text-accent tracking-widest mb-6">{data.code}</div>
          <p className="text-sm text-foreground/60 mb-2">Shareable link</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 bg-background border border-surface p-3 rounded-lg text-sm font-mono"
            />
            <button
              onClick={copy}
              className="bg-accent text-background px-6 py-3 rounded-lg font-semibold hover:bg-accent/90"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface rounded-xl border border-accent/20 p-5">
              <div className="text-2xl font-bold text-accent">{s.value}</div>
              <div className="text-foreground/60 text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-foreground/50 mt-6">
          This link is private — keep it to yourself. Payouts are settled separately by the team.
        </p>
      </div>
    </div>
  )
}
