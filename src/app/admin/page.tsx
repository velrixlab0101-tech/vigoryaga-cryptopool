'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { motion } from 'framer-motion'

const ADMIN_WALLET = '' // Set your admin wallet address in env later

interface Draw {
  id: string
  title: string
  ticketPrice: number
  operatorFeePct: number
  status: string
  closeTime: string
  tickets: any[]
  winners: any[]
}

export default function AdminPage() {
  const { address } = useAccount()
  const [draws, setDraws] = useState<Draw[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '',
    ticketPrice: '1.0',
    operatorFeePct: '10',
    startTime: '',
    closeTime: '',
  })
  
  useEffect(() => {
    fetch('/api/draws').then(r => r.json()).then(setDraws)
  }, [])
  
  const createDraw = async () => {
    await fetch('/api/draws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    location.reload()
  }
  
  const isAdmin = address && address.toLowerCase() === ADMIN_WALLET.toLowerCase()
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-foreground/70">Not authorized</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-accent text-background px-6 py-2 rounded-lg font-semibold hover:bg-accent/90"
          >
            Create Draw
          </button>
        </div>
        
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-xl p-6 border border-accent/20 mb-8"
          >
            <h2 className="text-xl font-semibold mb-4">New Draw</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                placeholder="Title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="bg-background border border-surface p-3 rounded-lg"
              />
              <input
                type="number"
                placeholder="Ticket Price (USDC)"
                value={form.ticketPrice}
                onChange={e => setForm({ ...form, ticketPrice: e.target.value })}
                className="bg-background border border-surface p-3 rounded-lg"
              />
              <input
                type="number"
                placeholder="Operator Fee %"
                value={form.operatorFeePct}
                onChange={e => setForm({ ...form, operatorFeePct: e.target.value })}
                className="bg-background border border-surface p-3 rounded-lg"
              />
              <div />
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="bg-background border border-surface p-3 rounded-lg"
              />
              <input
                type="datetime-local"
                value={form.closeTime}
                onChange={e => setForm({ ...form, closeTime: e.target.value })}
                className="bg-background border border-surface p-3 rounded-lg"
              />
            </div>
            <button
              onClick={createDraw}
              className="mt-4 bg-accent text-background px-6 py-2 rounded-lg font-semibold hover:bg-accent/90"
            >
              Create
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
