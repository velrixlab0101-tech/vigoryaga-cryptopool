'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount, useSignMessage } from 'wagmi'
import { motion } from 'framer-motion'
import { isAdminAddress, getAdminWallet, buildAdminFetchHeaders } from '@/lib/admin-client'
import { errorMessage } from '@/lib/errors'

interface Draw {
  id: string
  title: string
  ticketPrice: number
  operatorFeePct: number
  status: string
  closeTime: string
  tickets: unknown[]
  winners: unknown[]
}

export default function AdminPage() {
  let address: string | undefined
  try {
    const acc = useAccount()
    address = acc?.address
  } catch {
    address = undefined
  }
  let signMessageAsync: any
  try {
    signMessageAsync = useSignMessage().signMessageAsync
  } catch {
    signMessageAsync = async () => { throw new Error('wallet not ready') }
  }
  const [draws, setDraws] = useState<Draw[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '',
    ticketPrice: '1.0',
    operatorFeePct: '10',
    startTime: '',
    closeTime: '',
  })
  const [error, setError] = useState('')
  
  useEffect(() => {
    fetch('/api/draws').then(r => r.json()).then(setDraws)
  }, [])
  
  const createDraw = async () => {
    try {
      setError('')
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch('/api/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.reason || data.error || 'Failed to create draw')
        return
      }
      location.reload()
    } catch (e) {
      setError(errorMessage(e, 'Failed to create draw'))
    }
  }
  
  const isAdmin = isAdminAddress(address)
  const adminWallet = getAdminWallet()

  const setStatus = async (drawId: string, status: 'open' | 'closed') => {
    try {
      setError('')
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch(`/api/draws/${drawId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.reason || data.error || 'Failed to update status')
        return
      }
      location.reload()
    } catch (e) {
      setError(errorMessage(e, 'Failed to update status'))
    }
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-foreground/70">
          Not authorized {adminWallet ? ` (admin: ${adminWallet.slice(0,6)}...${adminWallet.slice(-4)})` : '(no admin wallet configured)'}
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <div className="flex items-center gap-3">
            <Link href="/admin/creators" className="btn btn-ghost">
              Creators
            </Link>
            <Link href="/admin/lotteries" className="btn btn-ghost">
              Lotteries
            </Link>
            <Link href="/admin/games" className="btn btn-ghost">
              Games Win Control
            </Link>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="bg-accent text-background px-6 py-2 rounded-lg font-semibold hover:bg-accent/90"
            >
              Create Draw
            </button>
          </div>
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
                placeholder="Ticket Price (USD)"
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
            {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
            <button
              onClick={createDraw}
              className="mt-4 bg-accent text-background px-6 py-2 rounded-lg font-semibold hover:bg-accent/90"
            >
              Create
            </button>
          </motion.div>
        )}
        
        <div className="grid gap-4">
          {draws.map((draw) => (
            <div key={draw.id} className="bg-surface rounded-xl p-6 border border-accent/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{draw.title}</h3>
                  <p className="text-foreground/70 text-sm">Status: {draw.status} • Tickets: {draw.tickets.length}</p>
                </div>
                <div className="flex items-center gap-3">
                  {draw.status === 'draft' && (
                    <button
                      onClick={() => setStatus(draw.id, 'open')}
                      className="bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm hover:bg-green-500/30"
                    >
                      Launch
                    </button>
                  )}
                  {draw.status === 'open' && (
                    <button
                      onClick={() => setStatus(draw.id, 'closed')}
                      className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-sm hover:bg-red-500/30"
                    >
                      Close
                    </button>
                  )}
                  <a href={`/admin/draw/${draw.id}`} className="text-accent hover:underline">Manage Results →</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
