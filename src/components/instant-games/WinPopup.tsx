'use client'

export default function WinPopup({ show, amount, multiplier }: { show: boolean; amount: number; multiplier?: number }) {
  if (!show) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 animate-pulse" />
      <div className="relative text-center">
        <div className="text-6xl sm:text-8xl font-black gradient-text drop-shadow-[0_0_120px_rgba(245,197,66,1)] animate-bounce">BIG WIN!</div>
        <div className="mt-4 text-4xl sm:text-6xl font-black text-accent drop-shadow-[0_0_80px_rgba(245,197,66,0.9)]">+${amount.toFixed(2)}</div>
        {multiplier && <div className="mt-2 text-xl text-muted">{multiplier.toFixed(2)}x</div>}
      </div>
    </div>
  )
}
