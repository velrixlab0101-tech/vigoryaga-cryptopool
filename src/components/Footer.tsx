import Link from 'next/link'
import { prisma } from '@/lib/prisma'

const NAV = [
  { href: '/draws', label: 'Active draws' },
  { href: '/history', label: 'Draw history' },
  { href: '/winners', label: 'Winners' },
  { href: '/my-tickets', label: 'My tickets' },
  { href: '/referrals', label: 'Referrals' },
]

const LEGAL = [
  { href: 'https://bscscan.com', label: 'BscScan', external: true },
]

async function operatingSince(): Promise<number> {
  try {
    const first = await prisma.draw.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    })
    return first?.createdAt.getFullYear() ?? new Date().getFullYear()
  } catch {
    return new Date().getFullYear()
  }
}

export async function Footer() {
  const year = new Date().getFullYear()
  const since = await operatingSince()
  return (
    <footer className="mt-20 border-t border-border bg-background-2/60">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-sm font-black text-[#1a1400]">
                C
              </span>
              <span className="text-base font-extrabold tracking-tight">
                Crypto<span className="text-accent">Pool</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Provably fair crypto lucky draws on BNB Smart Chain. Pay with USDC or USDT, win a share of
              the pot, and verify every payout on-chain.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
              <span className="chip">Since {since}</span>
              <span className="chip">BNB Smart Chain</span>
              <span className="chip">USDC</span>
              <span className="chip">USDT</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Explore</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Resources</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {LEGAL.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted transition-colors hover:text-foreground"
                  >
                    {l.label} ↗
                  </a>
                </li>
              ))}
              <li>
                <span className="text-muted">Payouts: manual, on BNB Smart Chain</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} CryptoPool. All rights reserved.</p>
          <p>
            Crypto assets are volatile. Play responsibly — tickets are non-refundable once a
            draw is live, except when a draw is cancelled by the operator.
          </p>
        </div>
      </div>
    </footer>
  )
}
