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
      <div className="container-page">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-4xl font-bold tracking-tight"
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
              className="card card-hover p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="mb-2 text-2xl font-semibold break-words">{draw.title}</h2>
                  <p className="text-foreground/70">Ticket: ${draw.ticketPrice} • Tickets: {draw.tickets?.length || 0}</p>
                  <p className="text-foreground/70">Closes: {new Date(draw.closeTime).toLocaleString()}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-3xl font-bold text-accent mb-2">${draw.potTotal}</div>
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
