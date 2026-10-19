'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-accent hover:text-accent/80 transition-colors">
              CryptoPool
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link href="/" className="text-foreground/80 hover:text-foreground transition-colors">Draws</Link>
              <Link href="/winners" className="text-foreground/80 hover:text-foreground transition-colors">Winners</Link>
              <Link href="/my-tickets" className="text-foreground/80 hover:text-foreground transition-colors">My Tickets</Link>
              <Link href="/referrals" className="text-foreground/80 hover:text-foreground transition-colors">Referrals</Link>
              <Link href="/admin" className="text-foreground/80 hover:text-foreground transition-colors">Admin</Link>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </nav>
  )
}
