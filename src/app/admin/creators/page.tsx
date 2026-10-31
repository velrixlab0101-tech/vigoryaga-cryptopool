'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAccount, useSignMessage } from 'wagmi'
import { buildAdminFetchHeaders, getAdminWallet, isAdminAddress } from '@/lib/admin-client'
import { errorMessage } from '@/lib/errors'

interface Creator {
  id: string
  code: string
  ownerAddress: string
  displayName: string | null
  sharePct: number | null
  accessToken: string | null
  active: boolean
  earnedCredits: number
  paidOut: number
  referredUsers: number
  referredVolume: number
}

export default function AdminCreatorsPage() {
  let address: string | undefined
  try { address = useAccount().address } catch { address = undefined }
  let signMessageAsync: any
  try { signMessageAsync = useSignMessage().signMessageAsync } catch { signMessageAsync = async () => { throw new Error('wallet not ready') } }
  const [creators, setCreators] = useState<Creator[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ wallet: '', sharePct: '10', displayName: '' })

  const isAdmin = isAdminAddress(address)

  const load = useCallback(async () => {
    try {
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch('/api/referrals/admin', { headers })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data?.creators)) setCreators(data.creators)
    } catch {
      /* ignore */
    }
  }, [address, signMessageAsync])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  const submit = async () => {
    try {
      setError('')
      setNotice('')
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch('/api/referrals/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          wallet: form.wallet.trim(),
          sharePct: Number(form.sharePct),
          displayName: form.displayName.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.reason || data.error || 'Failed to save creator')
        return
      }
      setNotice(`Saved. Secret link: /creator/${data.accessToken}`)
      setForm({ wallet: '', sharePct: '10', displayName: '' })
      load()
    } catch (e) {
      setError(errorMessage(e, 'Failed to save creator'))
    }
  }

  const toggleActive = async (c: Creator) => {
    try {
      setError('')
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch('/api/referrals/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          wallet: c.ownerAddress,
          sharePct: Number(c.sharePct ?? 0),
          displayName: c.displayName,
          active: !c.active,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.reason || data.error || 'Failed to update creator')
        return
      }
      load()
    } catch (e) {
      setError(errorMessage(e, 'Failed to update creator'))
    }
  }

  const recordPayout = async (c: Creator) => {
    const pending = c.earnedCredits - c.paidOut
    const input = window.prompt(`Amount to record for ${c.code} (pending $${pending.toFixed(2)}):`, pending.toFixed(2))
    if (input === null) return
    const amount = Number(input)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid payout amount')
      return
    }
    try {
      setError('')
      const headers = await buildAdminFetchHeaders(address, signMessageAsync)
      const res = await fetch(`/api/referrals/admin/${c.id}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ amount, note: 'Manual off-chain payout' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.reason || data.error || 'Failed to record payout')
        return
      }
      load()
    } catch (e) {
      setError(errorMessage(e, 'Failed to record payout'))
    }
  }

  if (!isAdmin) {
    const adminWallet = getAdminWallet()
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-foreground/70">
          Not authorized{' '}
          {adminWallet
            ? ` (admin: ${adminWallet.slice(0, 6)}...${adminWallet.slice(-4)})`
            : '(no admin wallet configured)'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-accent hover:underline text-sm">
            ← Admin
          </Link>
          <h1 className="text-4xl font-bold mt-2">Creators</h1>
          <p className="text-foreground/70 mt-2">
            Private revenue-share partners. Nothing here is visible to normal users.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl p-6 border border-accent/20 mb-8"
        >
          <h2 className="text-xl font-semibold mb-4">Add or update a creator</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <input
              placeholder="Wallet 0x…"
              value={form.wallet}
              onChange={(e) => setForm({ ...form, wallet: e.target.value })}
              className="bg-background border border-surface p-3 rounded-lg font-mono text-sm"
            />
            <input
              type="number"
              placeholder="Share % (0–50)"
              value={form.sharePct}
              onChange={(e) => setForm({ ...form, sharePct: e.target.value })}
              className="bg-background border border-surface p-3 rounded-lg"
            />
            <input
              placeholder="Display name (optional)"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="bg-background border border-surface p-3 rounded-lg"
            />
          </div>
          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
          {notice && <p className="mt-3 text-accent text-sm break-all">{notice}</p>}
          <button
            onClick={submit}
            className="mt-4 bg-accent text-background px-6 py-2 rounded-lg font-semibold hover:bg-accent/90"
          >
            Save creator
          </button>
        </motion.div>

        <div className="overflow-x-auto bg-surface rounded-xl border border-accent/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-foreground/50 text-left">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Wallet</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Users</th>
                <th className="py-3 px-4 text-right">Volume</th>
                <th className="py-3 px-4 text-right">Earned</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c.id} className="border-t border-surface">
                  <td className="py-3 px-4 font-mono">{c.code}</td>
                  <td className="py-3 px-4 font-mono text-xs">
                    {c.ownerAddress.slice(0, 6)}…{c.ownerAddress.slice(-4)}
                  </td>
                  <td className="py-3 px-4 text-right">{Number(c.sharePct ?? 0)}%</td>
                  <td className="py-3 px-4 text-right">{c.referredUsers}</td>
                  <td className="py-3 px-4 text-right">${Number(c.referredVolume).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">${Number(c.earnedCredits).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">${Number(c.paidOut).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        c.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {c.active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => recordPayout(c)}
                      className="text-accent hover:underline mr-3"
                    >
                      Payout
                    </button>
                    <button onClick={() => toggleActive(c)} className="text-foreground/70 hover:underline">
                      {c.active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
              {creators.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 px-4 text-center text-foreground/50">
                    No creators yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
