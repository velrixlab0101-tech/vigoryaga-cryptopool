import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { WinnerReveal } from '@/components/WinnerReveal'
import { displayName, maskAddress } from '@/lib/mask'

interface Props {
  params: Promise<{ drawId: string }>
}

async function getDraw(drawId: string) {
  return prisma.draw.findUnique({
    where: { id: drawId },
    select: {
      id: true,
      title: true,
      potTotal: true,
      status: true,
      createdAt: true,
      winners: {
        orderBy: { place: 'asc' },
        select: { place: true, wallet: true, amount: true, spent: true, txHash: true },
      },
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { drawId } = await params
  const draw = await getDraw(drawId)
  if (!draw || draw.winners.length === 0) {
    return { title: 'Winners — CryptoPool' }
  }
  const total = draw.winners.reduce((s, w) => s + Number(w.amount), 0)
  const title = `Winners of ${draw.title} — CryptoPool`
  const description = `${draw.winners.length} winners shared $${total.toFixed(2)} in prizes on BNB Smart Chain. See the results.`
  const path = `/winners/${draw.id}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: 'website', url: path },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function DrawWinnersPage({ params }: Props) {
  const { drawId } = await params
  const draw = await getDraw(drawId)
  if (!draw || draw.winners.length === 0) notFound()

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/winners" className="text-accent hover:underline text-sm">
          ← All winners
        </Link>
        <div className="mt-4">
          <WinnerReveal
            title={draw.title}
            potTotal={Number(draw.potTotal)}
            winners={draw.winners.map((w) => ({
              place: w.place,
              wallet: maskAddress(w.wallet),
              displayName: displayName(w.wallet),
              amount: Number(w.amount),
              spent: Number(w.spent),
              txHash: w.txHash,
            }))}
            sharePath={`/winners/${draw.id}`}
            autoReveal
          />
        </div>
      </div>
    </div>
  )
}
