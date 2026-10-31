'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useAccount } from 'wagmi'
import { isAdminAddress } from '@/lib/admin-client'

const ConnectButton = dynamic(() => import('@rainbow-me/rainbowkit').then(m => m.ConnectButton), { ssr: false })

const LINKS = [
  { href: '/lotteries', label: 'Lotteries' },
  { href: '/draws', label: 'Classic' },
  { href: '/history', label: 'History' },
  { href: '/winners', label: 'Winners' },
  { href: '/my-tickets', label: 'My Entries' },
] as const

const ADMIN_LINK = { href: '/admin', label: 'Admin' } as const

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  let address: string | undefined
  try {
    const acc = useAccount()
    address = acc?.address
  } catch {
    address = undefined
  }
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const links = isAdminAddress(address) ? [...LINKS, ADMIN_LINK] : [...LINKS]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 glass border-b border-border/70"
    >
      <Link
        href="/draws"
        className="group relative flex items-center justify-center gap-2 overflow-hidden border-b border-accent/20 bg-gradient-to-r from-accent/15 via-accent/25 to-accent-2/15 px-4 py-2 text-center"
      >
        <span className="relative inline-flex items-center gap-2 text-xs font-semibold tracking-wide sm:text-sm">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/20 text-[10px]">🛡️</span>
          <span className="shimmer font-bold">
            Get 50% back on your first 5 losing draws
          </span>
          <span className="hidden text-accent transition-transform group-hover:translate-x-0.5 sm:inline">
            →
          </span>
        </span>
      </Link>

      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-accent to-accent-2 shadow-[0_10px_30px_-12px_rgba(245,197,66,0.9)]">
              <span className="text-lg font-black text-[#1a1400]">C</span>
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Crypto<span className="text-accent">Pool</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = isActive(l.href)
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    active ? 'text-foreground' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {l.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-accent to-accent-2"
                    />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            {mounted ? (
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
              />
            ) : (
              <div className="h-10 w-32 rounded-full bg-surface-2" />
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              className="grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground md:hidden"
            >
              <div className="space-y-1.5">
                <span className={`block h-0.5 w-5 bg-current transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
                <span className={`block h-0.5 w-5 bg-current transition-opacity ${open ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 w-5 bg-current transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/70 md:hidden"
          >
            <div className="container-page flex flex-col py-3">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                    isActive(l.href) ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

