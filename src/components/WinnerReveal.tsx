'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Celebration } from '@/components/Celebration'

export interface RevealWinner {
  place: number
  wallet: string
  amount: number
  spent: number
  txHash: string | null
}

const ordinal = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th')

const PLACE_STYLES: Record<number, string> = {
  1: 'from-yellow-400/30 to-yellow-600/10 border-yellow-400/40',
  2: 'from-slate-300/25 to-slate-500/10 border-slate-300/40',
  3: 'from-amber-600/25 to-amber-800/10 border-amber-600/40',
  4: 'from-accent/15 to-accent/5 border-accent/30',
  5: 'from-accent/15 to-accent/5 border-accent/30',
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function WinnerReveal({
  title,
  potTotal,
  winners,
  sharePath,
  autoReveal = false,
}: {
  title: string
  potTotal: number
  winners: RevealWinner[]
  sharePath: string
  autoReveal?: boolean
}) {
  const [revealed, setRevealed] = useState(autoReveal)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState(sharePath)

  useEffect(() => {
    setShareUrl(`${window.location.origin}${sharePath}`)
  }, [sharePath])

  const share = async () => {
    const text = `🎉 Winners of "${title}" — $${potTotal.toFixed(2)} USDC paid out on Base!`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CryptoPool Winners', text, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-accent/20 p-6 sm:p-8">
      <Celebration run={revealed} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-foreground/60 text-sm">
            Pot ${potTotal.toFixed(2)} • {winners.length} winners
          </p>
        </div>
        <div className="flex gap-2">
          {!revealed && (
            <button
              onClick={() => setRevealed(true)}
              className="bg-accent text-background px-5 py-2 rounded-lg font-semibold hover:bg-accent/90"
            >
              Reveal
            </button>
          )}
          <button
            onClick={share}
            className="border border-accent/40 text-accent px-5 py-2 rounded-lg font-semibold hover:bg-accent/10"
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <AnimatePresence>
          {[1, 2, 3, 4, 5].map((place, i) => {
            const w = winners.find((x) => x.place === place)
            return (
              <motion.div
                key={place}
                initial={false}
                animate={revealed ? { opacity: 1, rotateY: 0 } : { opacity: 0.35, rotateY: 90 }}
                transition={{ delay: revealed ? i * 0.25 : 0, duration: 0.5 }}
                className={`rounded-xl border bg-gradient-to-br p-4 text-center ${
                  w && revealed ? PLACE_STYLES[place] : 'from-surface to-surface border-surface'
                }`}
              >
                <div className="text-sm text-foreground/60 mb-2">
                  {place}
                  {ordinal(place)} place
                </div>
                {revealed && w ? (
                  <>
                    <div className="text-2xl font-bold text-accent mb-1">${w.amount.toFixed(2)}</div>
                    <div className="font-mono text-xs text-foreground/70">{short(w.wallet)}</div>
                    <div className="text-[11px] text-foreground/50 mt-1">
                      Spent ${w.spent.toFixed(2)} · Net +${w.amount.toFixed(2)}
                    </div>
                    {w.txHash && (
                      <a
                        href={`https://basescan.org/tx/${w.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[11px] text-accent/80 hover:underline mt-1"
                      >
                        view tx ↗
                      </a>
                    )}
                  </>
                ) : (
                  <div className="text-2xl font-bold text-foreground/30">?</div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
