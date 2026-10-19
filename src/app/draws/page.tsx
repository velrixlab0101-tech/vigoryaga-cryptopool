'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface Draw {
  id: string
  title: string
  ticketPrice: number
  status: string
  closeTime: string
  potTotal: number
  tickets: unknown[]
}

export default function DrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([])
  const [ref, setRef] = useState('')
  
  useEffect(() => {
    fetch('/api/draws').then(r => r.json()).then(setDraws)
    const code = new URLSearchParams(window.location.search).get('ref')
    if (code) setRef(code)
  }, [])
  
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-8"
        >
          Active Draws
        </motion.h1>
        
        <div className="grid gap-6">
          {draws.map((draw, i) => (
            <motion.div
              key={draw.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-surface rounded-xl p-6 border border-accent/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">{draw.title}</h2>
                  <p className="text-foreground/70">Ticket: ${draw.ticketPrice} USDC • Tickets: {draw.tickets?.length || 0}</p>
                  <p className="text-foreground/70">Closes: {new Date(draw.closeTime).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-accent mb-2">${draw.potTotal} USDC</div>
                  <span className="inline-block px-3 py-1 bg-accent/20 text-accent rounded-full text-sm">{draw.status}</span>
                </div>
              </div>
              {draw.status === 'open' && (
                <Link
                  href={`/draws/${draw.id}${ref ? `?ref=${ref}` : ''}`}
                  className="inline-block mt-4 bg-accent text-background px-5 py-2 rounded-lg font-semibold hover:bg-accent/90"
                >
                  Buy tickets →
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
