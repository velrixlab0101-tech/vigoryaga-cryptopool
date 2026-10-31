'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAccount, useSignMessage } from 'wagmi'
import { buildAdminFetchHeaders, getAdminWallet, isAdminAddress } from '@/lib/admin-client'

export default function AdminLotteriesPage() {
  let address: string | undefined
  try { address = useAccount().address } catch { address = undefined }
  let signMessageAsync: any
  try { signMessageAsync = useSignMessage().signMessageAsync } catch { signMessageAsync = async () => { throw new Error('wallet not ready') } }
  const isAdmin = isAdminAddress(address)
  const [lotteries, setLotteries] = useState<any[]>([])
  const [form, setForm] = useState({ slug: 'hourly', name: 'Hourly Blitz', type: 'hourly', description: '', icon: '⚡' })

  const load = useCallback(async () => {
    const headers = await buildAdminFetchHeaders(address, signMessageAsync)
    const res = await fetch('/api/lotteries/admin', { headers }).catch(() => null)
    if (res?.ok) { const d = await res.json(); if (Array.isArray(d?.lotteries)) setLotteries(d.lotteries) }
  }, [address, signMessageAsync])

  useEffect(() => { if (isAdmin) load() }, [isAdmin, load])

  if (!isAdmin) {
    const aw = getAdminWallet()
    return <div className="min-h-screen flex items-center justify-center text-muted">Not authorized {aw ? `(admin: ${aw.slice(0,6)}...${aw.slice(-4)})` : ''}</div>
  }

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="container-page">
        <div className="mb-8">
          <Link href="/admin" className="text-sm text-accent hover:underline">← Admin</Link>
          <h1 className="mt-2 text-4xl font-black">Lottery Hub</h1>
          <p className="mt-2 text-muted">Manage all 7 lottery types and their rounds</p>
        </div>
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Lottery</h2>
          <div className="grid gap-3 md:grid-cols-5">
            <input className="bg-background border border-surface p-2.5 rounded-lg" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="slug" />
            <input className="bg-background border border-surface p-2.5 rounded-lg" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="name" />
            <select className="bg-background border border-surface p-2.5 rounded-lg" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
              <option value="raffle">raffle</option><option value="fifty50">fifty50</option><option value="hourly">hourly</option><option value="daily">daily</option><option value="numbermatch">numbermatch</option><option value="keno">keno</option><option value="rollover">rollover</option>
            </select>
            <input className="bg-background border border-surface p-2.5 rounded-lg" value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})} placeholder="icon" />
            <input className="bg-background border border-surface p-2.5 rounded-lg" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="description" />
          </div>
        </div>
        <div className="grid gap-3">
          {lotteries.map((l:any)=>(
            <div key={l.id} className="card p-5 flex items-center justify-between">
              <div className="flex items-center gap-3"><span className="text-2xl">{l.icon}</span><div><p className="font-semibold">{l.name}</p><p className="text-sm text-muted">/{l.slug} • {l.type}</p></div></div>
              <Link href={`/admin/lotteries/${l.id}`} className="text-accent hover:underline">Manage Rounds →</Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
