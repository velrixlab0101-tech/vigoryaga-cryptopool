'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Game = {
  id: string
  gameSlug: string
  displayName: string
  winPercent: number
  houseEdge: number
  enabled: boolean
  minBet: number
  maxBet: number
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [pw, setPw] = useState('')
  const [authed, setAuthed] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/games', { headers: { 'x-admin-password': pw } })
      if (res.ok) {
        const data = await res.json()
        setGames(data.games || [])
        setAuthed(true)
      } else {
        setAuthed(false)
      }
    } catch {
      setAuthed(false)
    }
    setLoading(false)
  }

  const save = async (g: Game) => {
    setSaving(g.gameSlug)
    try {
      await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pw },
        body: JSON.stringify(g),
      })
      await load()
    } catch {}
    setSaving(null)
  }

  useEffect(() => {
    const p = localStorage.getItem('cp_admin_pw')
    if (p) {
      setPw(p)
      setTimeout(() => {
        fetch('/api/admin/games', { headers: { 'x-admin-password': p } }).then(r => {
          if (r.ok) {
            r.json().then(d => { setGames(d.games||[]); setAuthed(true) })
          }
        }).finally(()=>setLoading(false))
      }, 10)
    } else {
      setLoading(false)
    }
  }, [])

  if (!authed) {
    return (
      <main className="min-h-screen">
        <section className="container-page py-10">
          <div className="mx-auto max-w-md card p-6">
            <h1 className="text-2xl font-bold">Admin Login</h1>
            <p className="mt-1 text-sm text-muted">Enter admin password to manage game win percentages</p>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} className="mt-4 w-full rounded-xl border border-border bg-surface px-4 py-2" placeholder="Password" />
            <button onClick={()=>{ localStorage.setItem('cp_admin_pw', pw); load() }} className="mt-3 w-full rounded-xl bg-accent py-2 font-semibold text-black">Login</button>
            <Link href="/admin" className="mt-3 block text-center text-sm text-muted hover:text-accent">← Back to Admin</Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-4 pt-10 pb-16 sm:pt-14">
        <div className="absolute inset-0 -z-10"><div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(245,197,66,0.18),transparent_70%)]" /><div className="grid-overlay" /></div>
        <div className="container-page">
          <Link href="/admin" className="text-sm text-muted hover:text-accent">← Back to Admin</Link>
          <div className="mt-4 mb-10 flex items-center justify-between">
            <div><div className="chip mb-3">Admin</div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Games <span className="gradient-text">Win Control</span></h1><p className="mt-2 text-muted">Control user win % for all instant games live</p></div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {games.map(g => (
              <div key={g.gameSlug} className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{g.displayName}</h2>
                    <p className="text-sm text-muted">/{g.gameSlug === 'slots' ? 'lotteries/slots' : `lotteries/instant/${g.gameSlug}`}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={g.enabled} onChange={e=>setGames(gs=>gs.map(x=>x.gameSlug===g.gameSlug?{...x,enabled:e.target.checked}:x))} /> Enabled</label>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between"><span className="text-sm text-muted">User Win %</span><span className="text-xl font-bold text-accent">{g.winPercent.toFixed(0)}%</span></div>
                  <input type="range" min={10} max={80} value={g.winPercent} onChange={e=>{
                    const wp = Number(e.target.value)
                    setGames(gs=>gs.map(x=>x.gameSlug===g.gameSlug?{...x, winPercent:wp, houseEdge:100-wp}:x))
                  }} className="mt-3 w-full accent-[#f5c542]" />
                  <div className="mt-2 flex justify-between text-xs text-muted"><span>House Edge: {g.houseEdge.toFixed(0)}%</span><span>RTP: {g.winPercent.toFixed(0)}%</span></div>
                </div>
                <button onClick={()=>save(g)} disabled={saving===g.gameSlug} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 py-2.5 font-semibold text-black disabled:opacity-50">{saving===g.gameSlug?'Saving...':'Save Changes'}</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
