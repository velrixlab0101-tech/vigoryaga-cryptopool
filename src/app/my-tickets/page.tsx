'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

interface Ticket {
  id: string
  qty: number
  amount: number
  txHash: string
  createdAt: string
  draw: {
    id: string
    title: string
    status: string
    closeTime: string
  }
}

export default function MyTicketsPage() {
  const { address, isConnected } = useAccount()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) {
      setTickets([])
      return
    }
    setLoading(true)
    fetch(`/api/tickets?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setTickets(d)
      })
      .finally(() => setLoading(false))
  }, [address])

  const totalSpent = tickets.reduce((s, t) => s + t.amount, 0)
  const totalQty = tickets.reduce((s, t) => s + t.qty, 0)

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-8"
        >
          My Tickets
        </motion.h1>

        {!isConnected ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-accent/20">
            <p className="text-foreground/70 mb-4">Connect your wallet to see your tickets.</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : loading ? (
          <p className="text-foreground/60">Loading…</p>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-accent/20">
            <p className="text-foreground/70 mb-4">No tickets yet.</p>
            <Link href="/draws" className="text-accent hover:underline">
              Browse active draws →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Tickets', value: totalQty },
                { label: 'Total spent', value: `$${totalSpent.toFixed(2)}` },
                { label: 'Draws entered', value: new Set(tickets.map((t) => t.draw.id)).size },
              ].map((s) => (
                <div key={s.label} className="bg-surface rounded-xl border border-accent/20 p-5">
                  <div className="text-2xl font-bold text-accent">{s.value}</div>
                  <div className="text-foreground/60 text-sm">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto bg-surface rounded-xl border border-accent/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-foreground/50 text-left">
                    <th className="py-3 px-4">Draw</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-t border-surface">
                      <td className="py-3 px-4">
                        <Link href={`/draws/${t.draw.id}`} className="hover:text-accent">
                          {t.draw.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right">{t.qty}</td>
                      <td className="py-3 px-4 text-right">${t.amount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs">
                          {t.draw.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-foreground/60">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`https://basescan.org/tx/${t.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
