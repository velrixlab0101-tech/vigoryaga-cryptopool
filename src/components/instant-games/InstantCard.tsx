import Link from 'next/link'

export default function InstantCard({ href, icon, title, desc, tag }: { href: string; icon: string; title: string; desc: string; tag?: string }) {
  return (
    <Link href={href} className="card card-hover group relative overflow-hidden p-6">
      {tag && <span className="absolute right-4 top-4 rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent">{tag}</span>}
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/25 to-accent-2/25 text-3xl shadow-[0_0_60px_rgba(245,197,66,0.18)]">{icon}</div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted">{desc}</p>
      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-muted">Play Instantly</span>
        <span className="text-accent transition-transform group-hover:translate-x-1">→</span>
      </div>
      <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
    </Link>
  )
}
