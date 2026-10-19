'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

interface Referral {
  code: string
  ownerAddress: string
  earnedCredits: number
  signupCount: number
  referredVolume: number
}

export default function ReferralsPage() {
  const { address, isConnected } = useAccount()
  const [data, setData] = useState<Referral | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!address) {
      setData(null)
      return
    }
    setLoading(true)
    fetch(`/api/referrals?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.code) setData(d)
      })
      .finally(() => setLoading(false))
  }, [address])

  const link = data ? `${origin}/draws?ref=${data.code}` : ''

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-2"
        >
          Referrals
        </motion.h1>
        <p className="text-foreground/70 mb-8">
          Share your link. Earn credit on every ticket bought through it.
        </p>

        {!isConnected ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-accent/20">
            <p className="text-foreground/70 mb-4">Connect your wallet to get your referral link.</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : loading || !data ? (
          <p className="text-foreground/60">Loading…</p>
        ) : (
          <>
            <div className="bg-surface rounded-2xl border border-accent/20 p-6 mb-6">
              <p className="text-sm text-foreground/60 mb-2">Your referral code</p>
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
              {[
                { label: 'Referred players', value: data.signupCount },
                { label: 'Referred volume', value: `$${data.referredVolume.toFixed(2)}` },
                { label: 'Earned credit', value: `$${data.earnedCredits.toFixed(2)}` },
              ].map((s) => (
                <div key={s.label} className="bg-surface rounded-xl border border-accent/20 p-5">
                  <div className="text-2xl font-bold text-accent">{s.value}</div>
                  <div className="text-foreground/60 text-sm">{s.label}</div>
                </div>
              ))}
            </div>

            <p className="text-xs text-foreground/50 mt-6">
              Credit accrues when someone buys a ticket through your link. Referrals cannot be
              self-credited.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
